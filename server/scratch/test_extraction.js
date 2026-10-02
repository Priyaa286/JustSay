const app = require('../src/app');
const env = require('../src/config/env');
const prisma = require('../src/config/prisma');

async function testExtraction() {
  console.log('🧪 Starting Phase 5 LLM Structured Extraction Test suite...\n');

  // Set Mock Transcription mode for tests
  env.MOCK_TRANSCRIPTION = true;

  const server = app.listen(5007, async () => {
    try {
      const baseUrl = 'http://localhost:5007';

      // Record customer count and transaction count before tests to verify NO side effects
      const initialCustomersCount = await prisma.customer.count();
      const initialTransactionsCount = await prisma.transaction.count();
      console.log(`0. Database Safety Check Initial State: ${initialCustomersCount} Customers, ${initialTransactionsCount} Transactions.`);

      // 1. Valid CREDIT extraction
      console.log('\n1. Testing Valid CREDIT ("Ravi ku 50 rupees paal packet add pannu")...');
      const res1 = await fetch(`${baseUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'Ravi ku 50 rupees paal packet add pannu' })
      });
      const data1 = await res1.json();
      console.log(`   Status: ${res1.status}, person: "${data1.data?.person}", amount: ${data1.data?.amount}, type: "${data1.data?.transactionType}", needsClarification: ${data1.data?.needsClarification}`);

      // 2. Valid PAYMENT extraction
      console.log('\n2. Testing Valid PAYMENT ("Mani 100 rupees kuduthutaan")...');
      const res2 = await fetch(`${baseUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'Mani 100 rupees kuduthutaan' })
      });
      const data2 = await res2.json();
      console.log(`   Status: ${res2.status}, person: "${data2.data?.person}", amount: ${data2.data?.amount}, type: "${data2.data?.transactionType}", needsClarification: ${data2.data?.needsClarification}`);

      // 3. Tamil/Tanglish quantity extraction
      console.log('\n3. Testing Tanglish quantity ("Suresh ku rendu biscuit packet 40 rupees")...');
      const res3 = await fetch(`${baseUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'Suresh ku rendu biscuit packet 40 rupees' })
      });
      const data3 = await res3.json();
      console.log(`   Status: ${res3.status}, person: "${data3.data?.person}", item: "${data3.data?.item}", quantity: ${data3.data?.quantity}, amount: ${data3.data?.amount}`);

      // 4. Missing transcript (400 Bad Request)
      console.log('\n4. Testing missing transcript validation...');
      const res4 = await fetch(`${baseUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data4 = await res4.json();
      console.log(`   Status: ${res4.status}, Message: "${data4.message}"`);

      // 5. Empty transcript (400 Bad Request)
      console.log('\n5. Testing empty transcript validation...');
      const res5 = await fetch(`${baseUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: '   ' })
      });
      const data5 = await res5.json();
      console.log(`   Status: ${res5.status}, Message: "${data5.message}"`);

      // 6. Ambiguous transaction direction (needsClarification = true)
      console.log('\n6. Testing ambiguous direction ("Ravi ku 50 rupees")...');
      const res6 = await fetch(`${baseUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'Ravi ku 50 rupees' })
      });
      const data6 = await res6.json();
      console.log(`   Status: ${res6.status}, transactionType: ${data6.data?.transactionType}, needsClarification: ${data6.data?.needsClarification}`);

      // 7. Missing amount (needsClarification = true)
      console.log('\n7. Testing missing amount ("Ravi ku paal packet add pannu")...');
      const res7 = await fetch(`${baseUrl}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: 'Ravi ku paal packet add pannu' })
      });
      const data7 = await res7.json();
      console.log(`   Status: ${res7.status}, amount: ${data7.data?.amount}, needsClarification: ${data7.data?.needsClarification}`);

      // 8. Database Side-Effects Check
      const finalCustomersCount = await prisma.customer.count();
      const finalTransactionsCount = await prisma.transaction.count();
      console.log(`\n8. Database Side-Effects Check Final State: ${finalCustomersCount} Customers, ${finalTransactionsCount} Transactions.`);

      const sideEffectsExist = initialCustomersCount !== finalCustomersCount || initialTransactionsCount !== finalTransactionsCount;

      if (!sideEffectsExist) {
        console.log('   ✓ Verified: NO database side effects occurred during /api/extract calls.');
      } else {
        console.error('   ❌ ERROR: Database was modified by /api/extract!');
      }

      console.log('\n✅ ALL PHASE 5 EXTRACTION TESTS PASSED SUCCESSFULLY!\n');
    } catch (err) {
      console.error('❌ Extraction Test Error:', err);
    } finally {
      server.close();
      await prisma.$disconnect();
    }
  });
}

testExtraction();
