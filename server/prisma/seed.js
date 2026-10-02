const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const initialCustomers = [
  { name: 'Ravi' },
  { name: 'Mani' },
  { name: 'Suresh' },
  { name: 'Lakshmi' },
  { name: 'Kumar' }
];

async function main() {
  console.log('🌱 Starting database seeding...');

  for (const customerData of initialCustomers) {
    const existing = await prisma.customer.findFirst({
      where: { name: customerData.name }
    });

    if (!existing) {
      const created = await prisma.customer.create({
        data: {
          name: customerData.name,
          balance: 0
        }
      });
      console.log(`  ✓ Created customer: ${created.name} (${created.id})`);
    } else {
      console.log(`  - Customer already exists: ${existing.name} (${existing.id})`);
    }
  }

  console.log('🌱 Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
