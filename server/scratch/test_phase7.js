const app = require('../src/app');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const { execSync } = require('child_process');

async function testPhase7() {
  console.log('🧪 Starting Phase 7 (New Customer Flow) Verification Test suite...\n');

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
  
  function assertCondition(label, condition) {
    if (condition) {
      console.log(`   ✅ ${label}`);
      passed++;
    } else {
      console.log(`   ❌ ${label}: condition failed`);
      failed++;
    }
  }

  // Create a dummy audio file
  const dummyAudioPath = path.join(__dirname, 'dummy.webm');
  fs.writeFileSync(dummyAudioPath, 'dummy content');

  const server = app.listen(5006, async () => {
    try {
      const baseUrl = 'http://localhost:5006';

      // Ensure mock transcription is on
      process.env.MOCK_TRANSCRIPTION = 'true';

      // 1. Existing customer (Ravi)
      console.log('1. Testing existing customer flow...');
      
      // Override mock for Ravi
      const origMock = process.env.MOCK_TRANSCRIPTION;
      
      // First let's create Ravi if not exists
      const custCheck = await fetch(`${baseUrl}/api/customers`);
      const custCheckData = await custCheck.json();
      if (!custCheckData.data.some(c => c.name === 'Ravi')) {
        await fetch(`${baseUrl}/api/customers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Ravi' })
        });
      }

      const fd1 = new FormData();
      fd1.append('audio', fs.createReadStream(dummyAudioPath));
      const voiceRes1 = await fetch(`${baseUrl}/api/voice`, {
        method: 'POST',
        headers: fd1.getHeaders(),
        body: fd1
      });
      const voiceData1 = await voiceRes1.json();
      assert('Ravi flow status', voiceData1.data?.status, 'PENDING');

      // 2. Unknown customer (Dinesh)
      console.log('\n2. Testing unknown customer (Dinesh)...');
      
      // Monkey patch aiService.extractTransaction just for this test
      const aiService = require('../src/services/ai.service');
      const origExtract = aiService.extractTransaction;
      aiService.extractTransaction = async () => ({
        person: 'Dinesh',
        item: 'biscuit',
        quantity: 1,
        amount: 100,
        transactionType: 'CREDIT',
        needsClarification: false
      });

      const fd2 = new FormData();
      fd2.append('audio', fs.createReadStream(dummyAudioPath));
      const voiceRes2 = await fetch(`${baseUrl}/api/voice`, {
        method: 'POST',
        headers: fd2.getHeaders(),
        body: fd2
      });
      const voiceData2 = await voiceRes2.json();
      
      assert('Unknown customer status', voiceData2.data?.status, 'NEW_CUSTOMER_DETECTED');
      assert('Customer name in response', voiceData2.data?.customer?.name, 'Dinesh');

      // Verify Dinesh is NOT in DB
      const allCustRes = await fetch(`${baseUrl}/api/customers`);
      const allCust = await allCustRes.json();
      assertCondition('Dinesh not in DB', !allCust.data.some(c => c.name === 'Dinesh'));

      // 3. Explicit Customer Creation
      console.log('\n3. Explicit customer creation (Dinesh)...');
      const createRes = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Dinesh' })
      });
      const createData = await createRes.json();
      assert('Create status', createRes.status, 201);
      const dineshId = createData.data.id;
      assert('Initial balance', createData.data.balance, 0);

      // 4. Prepare transaction after creation
      console.log('\n4. Prepare transaction after creation...');
      const prepRes = await fetch(`${baseUrl}/api/ledger/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: dineshId,
          item: 'biscuit',
          quantity: 1,
          amount: 100,
          type: 'CREDIT'
        })
      });
      const prepData = await prepRes.json();
      assert('Prepare status', prepRes.status, 201);
      assert('Transaction status', prepData.data.status, 'PENDING');
      const txId = prepData.data.id;

      // 5. Confirm transaction
      console.log('\n5. Confirm transaction...');
      const confRes = await fetch(`${baseUrl}/api/ledger/${txId}/confirm`, { method: 'POST' });
      assert('Confirm response', confRes.status, 200);
      
      const dineshAfter = await fetch(`${baseUrl}/api/customers/${dineshId}`);
      const dineshAfterData = await dineshAfter.json();
      assert('Dinesh balance after CONFIRM (100 rupees -> 10000 paise)', dineshAfterData.data.balance, 10000);

      // 6. Duplicate customer
      console.log('\n6. Duplicate customer protection...');
      const dupRes = await fetch(`${baseUrl}/api/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'diNeSh' })
      });
      assert('Duplicate create status', dupRes.status, 409);

      // 7. Payment flow check
      console.log('\n7. Payment flow check...');
      aiService.extractTransaction = async () => ({
        person: 'Dinesh',
        item: null,
        quantity: null,
        amount: 40,
        transactionType: 'PAYMENT',
        needsClarification: false
      });
      const fd3 = new FormData();
      fd3.append('audio', fs.createReadStream(dummyAudioPath));
      const voiceRes3 = await fetch(`${baseUrl}/api/voice`, { 
        method: 'POST', 
        headers: fd3.getHeaders(),
        body: fd3 
      });
      const voiceData3 = await voiceRes3.json();
      assert('Dinesh found status', voiceData3.data?.status, 'PENDING');
      
      const payTxId = voiceData3.data?.transactionId;
      await fetch(`${baseUrl}/api/ledger/${payTxId}/confirm`, { method: 'POST' });
      
      const dineshFinal = await fetch(`${baseUrl}/api/customers/${dineshId}`);
      const dineshFinalData = await dineshFinal.json();
      assert('Balance after 40 PAYMENT (10000 - 4000 = 6000)', dineshFinalData.data.balance, 6000);

      // 8. Idempotent confirmation
      console.log('\n8. Idempotent confirmation...');
      await fetch(`${baseUrl}/api/ledger/${payTxId}/confirm`, { method: 'POST' });
      const dineshIdempotent = await fetch(`${baseUrl}/api/customers/${dineshId}`);
      const dineshIdempotentData = await dineshIdempotent.json();
      assert('Balance remains 6000', dineshIdempotentData.data.balance, 6000);

      // Restore AI service
      aiService.extractTransaction = origExtract;

      // Summary
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  Phase 7 API Results: ${passed} passed, ${failed} failed`);
      console.log(`${'═'.repeat(50)}`);
      
    } catch (err) {
      console.error('❌ Test Error:', err);
    } finally {
      server.close();
      if (fs.existsSync(dummyAudioPath)) {
        fs.unlinkSync(dummyAudioPath);
      }
    }
  });
}

testPhase7();
