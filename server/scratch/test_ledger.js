const prisma = require('../src/config/prisma');
const {
  createTransaction,
  confirmTransaction,
  getCustomerBalance,
  getCustomerLedger,
  TRANSACTION_TYPES
} = require('../src/services/ledger.service');

async function testLedger() {
  console.log('🧪 Starting Phase 2 Core Ledger Verification Test...\n');

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

  // Use a fresh test customer to avoid polluting seeded data
  const testCustomer = await prisma.customer.create({
    data: { name: 'LedgerTestUser', balance: 0 }
  });
  console.log(`1. Created test customer: ${testCustomer.name} (ID: ${testCustomer.id})`);

  let initialBalance = await getCustomerBalance(testCustomer.id);
  assert('Initial balance (paise)', initialBalance.balancePaise, 0);

  // 2. Create Transaction 1: CREDIT ₹50 (in rupees, unconfirmed)
  console.log('\n2. Creating Transaction 1 (CREDIT ₹50, confirmed = false)...');
  const tx1 = await createTransaction({
    customerId: testCustomer.id,
    item: 'Apples 1kg',
    quantity: '1kg',
    amount: 50,  // ₹50 in RUPEES
    type: TRANSACTION_TYPES.CREDIT,
    transcript: 'Ravi took 1kg apples for 50 rupees',
    confirmed: false
  });
  assert('Tx1 confirmed', tx1.confirmed, false);
  assert('Tx1 status', tx1.status, 'PENDING');
  assert('Tx1 amount in paise', tx1.amount, 5000);

  let balanceAfterTx1Unconfirmed = await getCustomerBalance(testCustomer.id);
  assert('Balance (unconfirmed)', balanceAfterTx1Unconfirmed.balancePaise, 0);

  // 3. Confirm Transaction 1
  console.log('\n3. Confirming Transaction 1...');
  const confirmTx1Res = await confirmTransaction(tx1.id);
  assert('Tx1 confirmed status', confirmTx1Res.transaction.confirmed, true);
  assert('Tx1 confirmed status field', confirmTx1Res.transaction.status, 'CONFIRMED');

  let balanceAfterTx1Confirmed = await getCustomerBalance(testCustomer.id);
  assert('Balance after CREDIT ₹50', balanceAfterTx1Confirmed.balancePaise, 5000);

  // 4. Create Transaction 2: PAYMENT ₹20 (in rupees, unconfirmed)
  console.log('\n4. Creating Transaction 2 (PAYMENT ₹20, confirmed = false)...');
  const tx2 = await createTransaction({
    customerId: testCustomer.id,
    amount: 20,  // ₹20 in RUPEES
    type: TRANSACTION_TYPES.PAYMENT,
    transcript: 'Ravi paid 20 rupees cash',
    confirmed: false
  });
  assert('Tx2 amount in paise', tx2.amount, 2000);

  let balanceAfterTx2Unconfirmed = await getCustomerBalance(testCustomer.id);
  assert('Balance (unconfirmed payment)', balanceAfterTx2Unconfirmed.balancePaise, 5000);

  // 5. Confirm Transaction 2
  console.log('\n5. Confirming Transaction 2...');
  const confirmTx2Res = await confirmTransaction(tx2.id);
  assert('Tx2 confirmed status', confirmTx2Res.transaction.confirmed, true);

  let balanceAfterTx2Confirmed = await getCustomerBalance(testCustomer.id);
  assert('Balance after PAYMENT ₹20', balanceAfterTx2Confirmed.balancePaise, 3000);

  // 6. Duplicate Confirmation (Idempotency Test)
  console.log('\n6. Attempting duplicate confirmation of Transaction 2...');
  const reConfirmTx2Res = await confirmTransaction(tx2.id);
  assert('Re-confirm alreadyConfirmed flag', reConfirmTx2Res.alreadyConfirmed, true);

  let finalBalance = await getCustomerBalance(testCustomer.id);
  assert('Final balance unchanged', finalBalance.balancePaise, 3000);

  // 7. Get Full Ledger
  console.log('\n7. Fetching customer ledger...');
  const ledger = await getCustomerLedger(testCustomer.id);
  assert('Confirmed transaction count in ledger', ledger.transactions.length, 2);

  // Cleanup test customer and transactions
  await prisma.transaction.deleteMany({ where: { customerId: testCustomer.id } });
  await prisma.customer.delete({ where: { id: testCustomer.id } });
  console.log('\n   Cleaned up test customer and transactions.');

  // Summary
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Phase 2 Ledger Results: ${passed} passed, ${failed} failed`);
  console.log(`${'═'.repeat(50)}`);
  if (failed === 0) {
    console.log('✅ ALL CORE LEDGER VERIFICATION TESTS PASSED!\n');
  } else {
    console.log('❌ LEDGER TEST VERIFICATION FAILED!\n');
    process.exit(1);
  }
}

testLedger()
  .catch((e) => {
    console.error('❌ Error during ledger test:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
