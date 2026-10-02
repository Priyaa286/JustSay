const app = require('../src/app');

async function testApi() {
  console.log('🧪 Starting Phase 3 REST API Verification Test suite...\n');

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

  const server = app.listen(5005, async () => {
    try {
      const baseUrl = 'http://localhost:5005';

      // 1. GET /api/health
      console.log('1. Testing GET /api/health...');
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthData = await healthRes.json();
      assert('Health status', healthRes.status, 200);
      assert('Health message', healthData.success, true);

      // 2. GET /api/customers
      console.log('\n2. Testing GET /api/customers...');
      const customersRes = await fetch(`${baseUrl}/api/customers`);
      const customersData = await customersRes.json();
      assert('Customers status', customersRes.status, 200);
      console.log(`   Customer count: ${customersData.data.length}`);

      // 3. POST /api/customers — create fresh test customer
      console.log('\n3. Creating test customer...');
      const createCustRes = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'API Test User', nickname: 'Tester' })
      });
      const createCustData = await createCustRes.json();
      const newCustomerId = createCustData.data.id;
      assert('Create customer', createCustRes.status, 201);
      assert('Initial balance', createCustData.data.balance, 0);

      // 4. GET /api/customers/:id
      console.log(`\n4. Testing GET /api/customers/${newCustomerId}...`);
      const customerRes = await fetch(`${baseUrl}/api/customers/${newCustomerId}`);
      assert('Get customer', customerRes.status, 200);

      // 5. POST /api/ledger/prepare (CREDIT ₹50 in RUPEES)
      console.log('\n5. Testing POST /api/ledger/prepare (CREDIT ₹50)...');
      const prepareRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCustomerId,
          item: 'Milk packet',
          quantity: 1,
          amount: 50,  // ₹50 in RUPEES (not paise)
          type: 'CREDIT',
          transcript: 'Ravi ku 50 rupees paal packet add pannu'
        })
      });
      const prepareData = await prepareRes.json();
      const tx1Id = prepareData.data.id;
      assert('Prepare status', prepareRes.status, 201);
      assert('Transaction confirmed', prepareData.data.confirmed, false);
      assert('Transaction status', prepareData.data.status, 'PENDING');
      assert('Amount stored in paise', prepareData.data.amount, 5000);

      // Verify balance remains 0
      const custBal1 = await (await fetch(`${baseUrl}/api/customers/${newCustomerId}`)).json();
      assert('Balance (unconfirmed)', custBal1.data.balance, 0);

      // 6. POST /api/ledger/:id/confirm
      console.log(`\n6. Confirming transaction ${tx1Id}...`);
      const confirmRes = await fetch(`${baseUrl}/api/ledger/${tx1Id}/confirm`, { method: 'POST' });
      const confirmData = await confirmRes.json();
      assert('Confirm status', confirmRes.status, 200);
      assert('Transaction confirmed', confirmData.data.transaction.confirmed, true);

      const custBal2 = await (await fetch(`${baseUrl}/api/customers/${newCustomerId}`)).json();
      assert('Balance after CREDIT ₹50', custBal2.data.balance, 5000);

      // 7. Re-confirm (idempotency)
      console.log(`\n7. Re-confirming transaction ${tx1Id}...`);
      const reConfirmRes = await fetch(`${baseUrl}/api/ledger/${tx1Id}/confirm`, { method: 'POST' });
      const reConfirmData = await reConfirmRes.json();
      assert('Re-confirm status', reConfirmRes.status, 200);
      assert('Already confirmed msg', reConfirmData.message, 'Transaction has already been confirmed');

      const custBal3 = await (await fetch(`${baseUrl}/api/customers/${newCustomerId}`)).json();
      assert('Balance unchanged', custBal3.data.balance, 5000);

      // 8. Prepare PAYMENT ₹20 in RUPEES
      console.log('\n8. Preparing PAYMENT ₹20...');
      const prepPayRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCustomerId,
          amount: 20,  // ₹20 in RUPEES
          type: 'PAYMENT'
        })
      });
      const prepPayData = await prepPayRes.json();
      const tx2Id = prepPayData.data.id;
      assert('Payment prepare', prepPayRes.status, 201);
      assert('Payment amount in paise', prepPayData.data.amount, 2000);

      // 9. Confirm PAYMENT
      console.log(`\n9. Confirming PAYMENT ${tx2Id}...`);
      await fetch(`${baseUrl}/api/ledger/${tx2Id}/confirm`, { method: 'POST' });

      const custBal4 = await (await fetch(`${baseUrl}/api/customers/${newCustomerId}`)).json();
      assert('Balance after PAYMENT ₹20 (5000-2000)', custBal4.data.balance, 3000);

      // 10. GET /api/ledger/:customerId
      console.log(`\n10. Customer ledger...`);
      const ledgerRes = await fetch(`${baseUrl}/api/ledger/${newCustomerId}`);
      const ledgerData = await ledgerRes.json();
      assert('Confirmed tx count', ledgerData.data.transactions.length, 2);

      // 11. Invalid type validation
      console.log('\n11. Invalid type "RANDOM"...');
      const invalidTypeRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: newCustomerId, amount: 10, type: 'RANDOM' })
      });
      assert('Invalid type → 400', invalidTypeRes.status, 400);

      // 12. Negative amount validation
      console.log('\n12. Negative amount -500...');
      const negAmountRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: newCustomerId, amount: -500, type: 'CREDIT' })
      });
      assert('Negative amount → 400', negAmountRes.status, 400);

      // 13. Non-existent customer
      console.log('\n13. Non-existent customer...');
      const nonExistRes = await fetch(`${baseUrl}/api/customers/00000000-0000-0000-0000-000000000000`);
      assert('Non-existent customer → 404', nonExistRes.status, 404);

      // 14. Missing both customerId and person
      console.log('\n14. Missing customerId and person...');
      const noBothRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50, type: 'CREDIT' })
      });
      assert('Missing both → 400', noBothRes.status, 400);

      // Summary
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  Phase 3 API Results: ${passed} passed, ${failed} failed`);
      console.log(`${'═'.repeat(50)}`);
      if (failed === 0) {
        console.log('✅ ALL PHASE 3 API VERIFICATION TESTS PASSED!\n');
      } else {
        console.log('❌ SOME TESTS FAILED!\n');
      }
    } catch (err) {
      console.error('❌ API Test Error:', err);
    } finally {
      server.close();
    }
  });
}

testApi();
