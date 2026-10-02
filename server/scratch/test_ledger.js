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

  // 1. Fetch Ravi from seeded database
  const ravi = await prisma.customer.findFirst({
    where: { name: 'Ravi' }
  });

  if (!ravi) {
    throw new Error('Ravi not found in database! Seed might have failed.');
  }

  console.log(`1. Found Customer: ${ravi.name} (ID: ${ravi.id})`);
  let initialBalance = await getCustomerBalance(ravi.id);
  console.log(`   Initial Balance: ₹${initialBalance.balanceRupees} (${initialBalance.balancePaise} paise)\n`);

  // 2. Create Transaction 1: CREDIT 50 (Unconfirmed)
  console.log('2. Creating Transaction 1 (CREDIT ₹50, confirmed = false)...');
  const tx1 = await createTransaction({
    customerId: ravi.id,
    item: 'Apples 1kg',
    quantity: '1kg',
    amount: 5000, // ₹50.00 = 5000 paise
    type: TRANSACTION_TYPES.CREDIT,
    transcript: 'Ravi took 1kg apples for 50 rupees',
    confirmed: false
  });
  console.log(`   Created Transaction ID: ${tx1.id}, confirmed: ${tx1.confirmed}`);

  let balanceAfterTx1Unconfirmed = await getCustomerBalance(ravi.id);
  console.log(`   Verify Balance (Unconfirmed): ₹${balanceAfterTx1Unconfirmed.balanceRupees} (Expected: ₹0)\n`);

  // 3. Confirm Transaction 1
  console.log('3. Confirming Transaction 1...');
  const confirmTx1Res = await confirmTransaction(tx1.id);
  console.log(`   Transaction 1 confirmed status: ${confirmTx1Res.transaction.confirmed}`);
  
  let balanceAfterTx1Confirmed = await getCustomerBalance(ravi.id);
  console.log(`   Verify Balance (Confirmed): ₹${balanceAfterTx1Confirmed.balanceRupees} (Expected: ₹50)\n`);

  // 4. Create Transaction 2: PAYMENT 20 (Unconfirmed)
  console.log('4. Creating Transaction 2 (PAYMENT ₹20, confirmed = false)...');
  const tx2 = await createTransaction({
    customerId: ravi.id,
    amount: 2000, // ₹20.00 = 2000 paise
    type: TRANSACTION_TYPES.PAYMENT,
    transcript: 'Ravi paid 20 rupees cash',
    confirmed: false
  });
  console.log(`   Created Transaction ID: ${tx2.id}, confirmed: ${tx2.confirmed}`);

  let balanceAfterTx2Unconfirmed = await getCustomerBalance(ravi.id);
  console.log(`   Verify Balance (Unconfirmed): ₹${balanceAfterTx2Unconfirmed.balanceRupees} (Expected: ₹50)\n`);

  // 5. Confirm Transaction 2
  console.log('5. Confirming Transaction 2...');
  const confirmTx2Res = await confirmTransaction(tx2.id);
  console.log(`   Transaction 2 confirmed status: ${confirmTx2Res.transaction.confirmed}`);

  let balanceAfterTx2Confirmed = await getCustomerBalance(ravi.id);
  console.log(`   Verify Balance (Confirmed): ₹${balanceAfterTx2Confirmed.balanceRupees} (Expected: ₹30)\n`);

  // 6. Attempt Duplicate Confirmation of Transaction 2 (Idempotency Test)
  console.log('6. Attempting duplicate confirmation of Transaction 2 (Idempotency Test)...');
  const reConfirmTx2Res = await confirmTransaction(tx2.id);
  console.log(`   Re-confirm response alreadyConfirmed flag: ${reConfirmTx2Res.alreadyConfirmed}`);

  let finalBalance = await getCustomerBalance(ravi.id);
  console.log(`   Verify Final Balance: ₹${finalBalance.balanceRupees} (Expected: ₹30)\n`);

  // 7. Get Full Ledger
  console.log('7. Fetching full customer ledger...');
  const ledger = await getCustomerLedger(ravi.id);
  console.log(`   Total transactions in ledger: ${ledger.transactions.length}`);

  // Summary Assertions
  const passed =
    balanceAfterTx1Unconfirmed.balancePaise === 0 &&
    balanceAfterTx1Confirmed.balancePaise === 5000 &&
    balanceAfterTx2Unconfirmed.balancePaise === 5000 &&
    balanceAfterTx2Confirmed.balancePaise === 3000 &&
    finalBalance.balancePaise === 3000 &&
    reConfirmTx2Res.alreadyConfirmed === true;

  if (passed) {
    console.log('✅ ALL CORE LEDGER VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } else {
    console.error('❌ LEDGER TEST VERIFICATION FAILED!');
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
