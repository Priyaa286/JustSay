/**
 * Phase 6 — Database Repair Script
 * 
 * ISSUE 2: Backfill status for pre-existing confirmed transactions
 * ISSUE 4: Remove test-generated contamination
 * 
 * Legitimate data: 5 seeded customers (Ravi, Mani, Suresh, Lakshmi, Kumar)
 * with balance=0 and no transactions (seed.js creates no transactions).
 * 
 * All transactions + extra customers are from scratch test runs.
 */
const prisma = require('../src/config/prisma');

const SEEDED_CUSTOMER_NAMES = ['Ravi', 'Mani', 'Suresh', 'Lakshmi', 'Kumar'];

async function repair() {
  console.log('🔧 Phase 6 Database Repair Script\n');

  // ── Step 1: Snapshot current state ──────────────────────────
  const allCustomers = await prisma.customer.findMany();
  const allTransactions = await prisma.transaction.findMany();
  console.log(`Current state: ${allCustomers.length} customers, ${allTransactions.length} transactions\n`);

  // ── Step 2: Identify test-generated customers ──────────────
  // Seeded customers have exact names from seed.js. There should be exactly 1 of each.
  // Any customer not matching a seeded name is test-generated.
  const seededCustomers = [];
  const testCustomers = [];

  for (const cust of allCustomers) {
    if (SEEDED_CUSTOMER_NAMES.includes(cust.name)) {
      // Check for duplicates — if we already have one with this name, mark as test
      const alreadySeen = seededCustomers.find(s => s.name === cust.name);
      if (alreadySeen) {
        console.log(`  ⚠️  Duplicate seeded name "${cust.name}" (${cust.id}) — treating as test data`);
        testCustomers.push(cust);
      } else {
        seededCustomers.push(cust);
      }
    } else {
      testCustomers.push(cust);
    }
  }

  console.log(`Seeded customers to KEEP: ${seededCustomers.map(c => c.name).join(', ')}`);
  console.log(`Test customers to REMOVE: ${testCustomers.map(c => `${c.name} (${c.id})`).join(', ')}\n`);

  // ── Step 3: Identify test-generated transactions ───────────
  // ALL transactions are from test runs (seed.js creates none).
  const testTransactions = allTransactions;
  console.log(`Transactions to REMOVE: ${testTransactions.length} (all are test-generated)\n`);

  // ── Step 4: Delete test transactions ───────────────────────
  // Delete ALL transactions — they're all from scratch tests
  const deletedTxs = await prisma.transaction.deleteMany({});
  console.log(`  ✓ Deleted ${deletedTxs.count} test transactions`);

  // ── Step 5: Delete test customers ──────────────────────────
  for (const cust of testCustomers) {
    await prisma.customer.delete({ where: { id: cust.id } });
    console.log(`  ✓ Deleted test customer: ${cust.name} (${cust.id})`);
  }

  // ── Step 6: Reset seeded customer balances to 0 ────────────
  // Since all transactions were test-generated and have been removed,
  // the correct balance for all seeded customers is 0.
  for (const cust of seededCustomers) {
    if (cust.balance !== 0) {
      await prisma.customer.update({
        where: { id: cust.id },
        data: { balance: 0 }
      });
      console.log(`  ✓ Reset ${cust.name} balance: ${cust.balance} → 0`);
    } else {
      console.log(`  - ${cust.name} balance already 0`);
    }
  }

  // ── Step 7: ISSUE 2 — Backfill status consistency check ────
  // After cleanup there should be 0 transactions, but run the backfill
  // query anyway as a safety measure for any future data.
  const backfilled = await prisma.transaction.updateMany({
    where: { confirmed: true, status: 'PENDING' },
    data: { status: 'CONFIRMED' }
  });
  console.log(`\n  ✓ Backfilled ${backfilled.count} transactions (confirmed=true, status=PENDING → CONFIRMED)`);

  // ── Step 8: Verify final state ─────────────────────────────
  console.log('\n═══ FINAL STATE ═══');
  const finalCustomers = await prisma.customer.findMany({
    select: { id: true, name: true, balance: true }
  });
  console.log(`\nCustomers (${finalCustomers.length}):`);
  for (const c of finalCustomers) {
    console.log(`  ${c.name}: balance=${c.balance} paise (₹${c.balance / 100})`);
  }

  const finalTransactions = await prisma.transaction.findMany();
  console.log(`\nTransactions: ${finalTransactions.length}`);

  // Check for inconsistencies
  const inconsistent = await prisma.transaction.findMany({
    where: { confirmed: true, status: { not: 'CONFIRMED' } }
  });
  if (inconsistent.length > 0) {
    console.log(`\n❌ INCONSISTENCY: ${inconsistent.length} transactions have confirmed=true but status≠CONFIRMED`);
  } else {
    console.log('\n✅ No confirmed/status inconsistencies');
  }

  console.log('\n🔧 Repair complete.\n');
  await prisma.$disconnect();
}

repair().catch(e => {
  console.error('❌ Repair Error:', e);
  process.exit(1);
});
