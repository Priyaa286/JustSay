const prisma = require('../src/config/prisma');

async function check() {
  const txs = await prisma.transaction.findMany({
    select: { id: true, amount: true, type: true, status: true, confirmed: true, createdAt: true },
    orderBy: { createdAt: 'asc' }
  });
  console.log('=== TRANSACTIONS ===');
  console.log(JSON.stringify(txs, null, 2));

  const custs = await prisma.customer.findMany({
    select: { id: true, name: true, balance: true }
  });
  console.log('\n=== CUSTOMERS ===');
  console.log(JSON.stringify(custs, null, 2));

  await prisma.$disconnect();
}

check();
