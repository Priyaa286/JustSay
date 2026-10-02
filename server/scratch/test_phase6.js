const app = require('../src/app');
const prisma = require('../src/config/prisma');

async function testPhase6() {
  console.log('🧪 Starting Phase 6 — Complete Verification Tests...\n');

  const server = app.listen(5006, async () => {
    try {
      const baseUrl = 'http://localhost:5006';
      let passed = 0;
      let failed = 0;

      function assert(label, actual, expected) {
        if (actual === expected) {
          console.log(`   ✅ ${label}: ${actual}`);
          passed++;
        } else {
          console.log(`   ❌ ${label}: got ${actual}, expected ${expected}`);
          failed++;
        }
      }

      // ── Setup: Create a test customer with a nickname ──────
      console.log('0. Setup: creating test customers...');
      const custRes = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'P6TestCustomer', nickname: 'P6Nick' })
      });
      const custData = await custRes.json();
      const customerId = custData.data.id;
      assert('Test customer created', custRes.status, 201);

      // ── 1. Prepare CREDIT ₹50 (rupees) ────────────────────
      console.log('\n1. Preparing CREDIT ₹50 (rupees, not paise)...');
      const prepRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          item: 'Milk packet',
          quantity: 2,
          amount: 50,
          type: 'CREDIT',
          transcript: 'Ravi ku 50 rupees paal packet add pannu'
        })
      });
      const prepData = await prepRes.json();
      const txId = prepData.data.id;
      assert('Prepare status code', prepRes.status, 201);
      assert('Transaction confirmed', prepData.data.confirmed, false);
      assert('Transaction status', prepData.data.status, 'PENDING');
      assert('Amount stored in paise', prepData.data.amount, 5000);

      // ── 2. Balance stays 0 while PENDING ───────────────────
      console.log('\n2. Balance while PENDING...');
      const bal1 = await (await fetch(`${baseUrl}/api/customers/${customerId}`)).json();
      assert('Balance (unconfirmed)', bal1.data.balance, 0);

      // ── 3. Confirm transaction ─────────────────────────────
      console.log(`\n3. Confirming transaction...`);
      const confRes = await fetch(`${baseUrl}/api/ledger/${txId}/confirm`, { method: 'POST' });
      const confData = await confRes.json();
      assert('Confirm status code', confRes.status, 200);
      assert('Transaction confirmed', confData.data.transaction.confirmed, true);
      assert('Transaction status', confData.data.transaction.status, 'CONFIRMED');

      // ── 4. Balance = 5000 paise (₹50) ──────────────────────
      console.log('\n4. Balance after confirmation...');
      const bal2 = await (await fetch(`${baseUrl}/api/customers/${customerId}`)).json();
      assert('Balance (confirmed)', bal2.data.balance, 5000);

      // ── 5. Idempotent re-confirm ───────────────────────────
      console.log('\n5. Re-confirm (idempotency)...');
      const reConfRes = await fetch(`${baseUrl}/api/ledger/${txId}/confirm`, { method: 'POST' });
      const reConfData = await reConfRes.json();
      assert('Re-confirm status', reConfRes.status, 200);
      assert('Already confirmed', reConfData.message, 'Transaction has already been confirmed');
      const bal3 = await (await fetch(`${baseUrl}/api/customers/${customerId}`)).json();
      assert('Balance unchanged', bal3.data.balance, 5000);

      // ── 6. Prepare PAYMENT ₹20 then CANCEL ────────────────
      console.log('\n6. Prepare PAYMENT ₹20 for cancel...');
      const prepCancelRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, amount: 20, type: 'PAYMENT' })
      });
      const cancelTxData = await prepCancelRes.json();
      const cancelTxId = cancelTxData.data.id;
      assert('Status is PENDING', cancelTxData.data.status, 'PENDING');

      // ── 7. Cancel PENDING ──────────────────────────────────
      console.log(`\n7. Cancelling PENDING transaction...`);
      const cancelRes = await fetch(`${baseUrl}/api/ledger/${cancelTxId}/cancel`, { method: 'POST' });
      assert('Cancel status code', cancelRes.status, 200);

      const bal4 = await (await fetch(`${baseUrl}/api/customers/${customerId}`)).json();
      assert('Balance unchanged after cancel', bal4.data.balance, 5000);

      // ── 8. Cannot confirm CANCELLED ────────────────────────
      console.log('\n8. Confirm cancelled transaction...');
      const confCancelledRes = await fetch(`${baseUrl}/api/ledger/${cancelTxId}/confirm`, { method: 'POST' });
      assert('Confirm cancelled → 400', confCancelledRes.status, 400);

      // ── 9. Cannot cancel CONFIRMED ─────────────────────────
      console.log('\n9. Cancel confirmed transaction...');
      const cancelConfRes = await fetch(`${baseUrl}/api/ledger/${txId}/cancel`, { method: 'POST' });
      assert('Cancel confirmed → 400', cancelConfRes.status, 400);

      // ── 10. Full PAYMENT flow ──────────────────────────────
      console.log('\n10. Full PAYMENT ₹20 flow...');
      const payRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId, amount: 20, type: 'PAYMENT' })
      });
      const payData = await payRes.json();
      assert('Payment amount in paise', payData.data.amount, 2000);
      await fetch(`${baseUrl}/api/ledger/${payData.data.id}/confirm`, { method: 'POST' });
      const bal5 = await (await fetch(`${baseUrl}/api/customers/${customerId}`)).json();
      assert('Balance after payment (5000-2000)', bal5.data.balance, 3000);

      // ── 11. Ledger only shows CONFIRMED ────────────────────
      console.log('\n11. Ledger shows only CONFIRMED...');
      const ledgerRes = await fetch(`${baseUrl}/api/ledger/${customerId}`);
      const ledgerData = await ledgerRes.json();
      const allConfirmed = ledgerData.data.transactions.every(t => t.status === 'CONFIRMED');
      assert('All ledger txs are CONFIRMED', allConfirmed, true);
      assert('Confirmed count', ledgerData.data.transactions.length, 2);

      // ══════════════════════════════════════════════════════════
      // CUSTOMER RESOLUTION TESTS
      // ══════════════════════════════════════════════════════════
      console.log('\n══ CUSTOMER RESOLUTION TESTS ══');

      // ── 12. Resolve by exact name ──────────────────────────
      console.log('\n12. Resolve by exact name...');
      const resolveNameRes = await fetch(`${baseUrl}/api/customers/resolve?person=P6TestCustomer`);
      const resolveNameData = await resolveNameRes.json();
      assert('Resolve by name → 200', resolveNameRes.status, 200);
      assert('Resolved correct ID', resolveNameData.data.id, customerId);

      // ── 13. Resolve by nickname ────────────────────────────
      console.log('\n13. Resolve by nickname...');
      const resolveNickRes = await fetch(`${baseUrl}/api/customers/resolve?person=P6Nick`);
      const resolveNickData = await resolveNickRes.json();
      assert('Resolve by nickname → 200', resolveNickRes.status, 200);
      assert('Resolved correct ID', resolveNickData.data.id, customerId);

      // ── 14. Case-insensitive match ─────────────────────────
      console.log('\n14. Case-insensitive match...');
      const resolveCaseRes = await fetch(`${baseUrl}/api/customers/resolve?person=p6testcustomer`);
      assert('Case insensitive → 200', resolveCaseRes.status, 200);

      const resolveCaseNickRes = await fetch(`${baseUrl}/api/customers/resolve?person=p6nick`);
      assert('Case insensitive nickname → 200', resolveCaseNickRes.status, 200);

      // ── 15. Unknown customer → 404 ─────────────────────────
      console.log('\n15. Unknown customer...');
      const resolveUnknownRes = await fetch(`${baseUrl}/api/customers/resolve?person=NonExistentPerson`);
      const resolveUnknownData = await resolveUnknownRes.json();
      assert('Unknown → 404', resolveUnknownRes.status, 404);
      assert('Error code', resolveUnknownData.message.includes('No customer found'), true);

      // ── 16. Ambiguous customer → 409 ───────────────────────
      console.log('\n16. Ambiguous customer...');
      // Create a second customer with the same name to trigger ambiguity
      await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'P6TestCustomer', nickname: 'DuplicateP6' })
      });
      const resolveAmbigRes = await fetch(`${baseUrl}/api/customers/resolve?person=P6TestCustomer`);
      const resolveAmbigData = await resolveAmbigRes.json();
      assert('Ambiguous → 409', resolveAmbigRes.status, 409);
      assert('Error has Multiple', resolveAmbigData.message.includes('Multiple'), true);

      // ── 17. Prepare with person instead of customerId ──────
      console.log('\n17. Prepare with person (name resolution)...');
      // Use a seeded customer that's unique (e.g. "Ravi")
      const prepPersonRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: 'Ravi', amount: 30, type: 'CREDIT' })
      });
      const prepPersonData = await prepPersonRes.json();
      assert('Prepare with person → 201', prepPersonRes.status, 201);
      assert('Amount in paise', prepPersonData.data.amount, 3000);

      // ── 18. Prepare with unknown person → no transaction ───
      console.log('\n18. Prepare with unknown person...');
      const prepUnknownRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: 'UnknownPerson', amount: 30, type: 'CREDIT' })
      });
      assert('Unknown person → 404', prepUnknownRes.status, 404);

      // ── 19. Prepare with ambiguous person → no transaction ─
      console.log('\n19. Prepare with ambiguous person...');
      const prepAmbigRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: 'P6TestCustomer', amount: 30, type: 'CREDIT' })
      });
      assert('Ambiguous person → 409', prepAmbigRes.status, 409);

      // ── Cleanup test data ──────────────────────────────────
      console.log('\n── Cleaning up test data...');
      // Delete all transactions for test customers + Ravi's pending
      const testCusts = await prisma.customer.findMany({
        where: { name: 'P6TestCustomer' }
      });
      for (const tc of testCusts) {
        await prisma.transaction.deleteMany({ where: { customerId: tc.id } });
        await prisma.customer.delete({ where: { id: tc.id } });
      }
      // Clean up the Ravi PENDING transaction we just created
      await prisma.transaction.deleteMany({
        where: { customerId: (await prisma.customer.findFirst({ where: { name: 'Ravi' } })).id, status: 'PENDING' }
      });
      console.log('   Cleaned up all test data.');

      // ── Summary ────────────────────────────────────────────
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  Phase 6 Results: ${passed} passed, ${failed} failed`);
      console.log(`${'═'.repeat(50)}`);
      if (failed === 0) {
        console.log('✅ ALL PHASE 6 TESTS PASSED!\n');
      } else {
        console.log('❌ SOME TESTS FAILED — review output above.\n');
      }
    } catch (err) {
      console.error('❌ Test Error:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

testPhase6();
