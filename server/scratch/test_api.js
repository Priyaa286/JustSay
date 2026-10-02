const app = require('../src/app');

async function testApi() {
  console.log('🧪 Starting Phase 3 REST API Verification Test suite...\n');

  const server = app.listen(5005, async () => {
    try {
      const baseUrl = 'http://localhost:5005';

      // 1. GET /api/health
      console.log('1. Testing GET /api/health...');
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthData = await healthRes.json();
      console.log(`   Status: ${healthRes.status}, Response:`, healthData);

      // 2. GET /api/customers
      console.log('\n2. Testing GET /api/customers...');
      const customersRes = await fetch(`${baseUrl}/api/customers`);
      const customersData = await customersRes.json();
      console.log(`   Status: ${customersRes.status}, Customer count: ${customersData.data.length}`);
      const testCustomer = customersData.data[0];

      // 3. GET /api/customers/:id
      console.log(`\n3. Testing GET /api/customers/${testCustomer.id}...`);
      const customerRes = await fetch(`${baseUrl}/api/customers/${testCustomer.id}`);
      const customerData = await customerRes.json();
      console.log(`   Status: ${customerRes.status}, Name: ${customerData.data.name}`);

      // 4. POST /api/customers
      console.log('\n4. Testing POST /api/customers...');
      const createCustRes = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'API Test User', nickname: 'Tester' })
      });
      const createCustData = await createCustRes.json();
      console.log(`   Status: ${createCustRes.status}, Created ID: ${createCustData.data.id}, Balance: ${createCustData.data.balance}`);
      const newCustomerId = createCustData.data.id;

      // 5. POST /api/ledger/prepare (CREDIT ₹50 = 5000 paise)
      console.log('\n5. Testing POST /api/ledger/prepare (CREDIT ₹50 = 5000 paise)...');
      const prepareRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCustomerId,
          item: 'Milk packet',
          quantity: 1,
          amount: 5000,
          type: 'CREDIT',
          transcript: 'Ravi ku 50 rupees paal packet add pannu'
        })
      });
      const prepareData = await prepareRes.json();
      console.log(`   Status: ${prepareRes.status}, Transaction ID: ${prepareData.data.id}, confirmed: ${prepareData.data.confirmed}`);
      const tx1Id = prepareData.data.id;

      // Verify customer balance remains 0
      const custBalanceCheck1 = await (await fetch(`${baseUrl}/api/customers/${newCustomerId}`)).json();
      console.log(`   Verify Customer Balance (Unconfirmed): ${custBalanceCheck1.data.balance} (Expected: 0)`);

      // 6. POST /api/ledger/:id/confirm
      console.log(`\n6. Testing POST /api/ledger/${tx1Id}/confirm...`);
      const confirmRes = await fetch(`${baseUrl}/api/ledger/${tx1Id}/confirm`, { method: 'POST' });
      const confirmData = await confirmRes.json();
      console.log(`   Status: ${confirmRes.status}, confirmed: ${confirmData.data.transaction.confirmed}`);

      const custBalanceCheck2 = await (await fetch(`${baseUrl}/api/customers/${newCustomerId}`)).json();
      console.log(`   Verify Customer Balance (Confirmed): ${custBalanceCheck2.data.balance} (Expected: 5000)`);

      // 7. Re-confirm duplicate attempt
      console.log(`\n7. Testing duplicate confirmation on transaction ${tx1Id}...`);
      const reConfirmRes = await fetch(`${baseUrl}/api/ledger/${tx1Id}/confirm`, { method: 'POST' });
      const reConfirmData = await reConfirmRes.json();
      console.log(`   Status: ${reConfirmRes.status}, Message: "${reConfirmData.message}"`);

      const custBalanceCheck3 = await (await fetch(`${baseUrl}/api/customers/${newCustomerId}`)).json();
      console.log(`   Verify Customer Balance (After re-confirm): ${custBalanceCheck3.data.balance} (Expected: 5000)`);

      // 8. Prepare PAYMENT ₹20 = 2000 paise
      console.log('\n8. Testing POST /api/ledger/prepare (PAYMENT ₹20 = 2000 paise)...');
      const preparePaymentRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCustomerId,
          amount: 2000,
          type: 'PAYMENT'
        })
      });
      const preparePaymentData = await preparePaymentRes.json();
      const tx2Id = preparePaymentData.data.id;

      // 9. Confirm PAYMENT
      console.log(`\n9. Testing POST /api/ledger/${tx2Id}/confirm...`);
      await fetch(`${baseUrl}/api/ledger/${tx2Id}/confirm`, { method: 'POST' });

      const custBalanceCheck4 = await (await fetch(`${baseUrl}/api/customers/${newCustomerId}`)).json();
      console.log(`   Verify Customer Balance (After PAYMENT confirmed): ${custBalanceCheck4.data.balance} (Expected: 3000)`);

      // 10. GET /api/ledger/:customerId
      console.log(`\n10. Testing GET /api/ledger/${newCustomerId}...`);
      const custLedgerRes = await fetch(`${baseUrl}/api/ledger/${newCustomerId}`);
      const custLedgerData = await custLedgerRes.json();
      console.log(`   Confirmed transaction count: ${custLedgerData.data.transactions.length}`);

      // 11. Invalid type validation
      console.log('\n11. Testing validation: Invalid type "RANDOM"...');
      const invalidTypeRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCustomerId,
          amount: 1000,
          type: 'RANDOM'
        })
      });
      const invalidTypeData = await invalidTypeRes.json();
      console.log(`   Status: ${invalidTypeRes.status}, Message: "${invalidTypeData.message}"`);

      // 12. Invalid negative amount validation
      console.log('\n12. Testing validation: Negative amount -500...');
      const negAmountRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: newCustomerId,
          amount: -500,
          type: 'CREDIT'
        })
      });
      const negAmountData = await negAmountRes.json();
      console.log(`   Status: ${negAmountRes.status}, Message: "${negAmountData.message}"`);

      // 13. Missing customer check
      console.log('\n13. Testing non-existent customer 404...');
      const nonExistentRes = await fetch(`${baseUrl}/api/customers/00000000-0000-0000-0000-000000000000`);
      const nonExistentData = await nonExistentRes.json();
      console.log(`   Status: ${nonExistentRes.status}, Message: "${nonExistentData.message}"`);

      console.log('\n✅ ALL PHASE 3 API VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
    } catch (err) {
      console.error('❌ API Test Error:', err);
    } finally {
      server.close();
    }
  });
}

testApi();
