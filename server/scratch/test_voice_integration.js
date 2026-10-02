/**
 * Integration Tests for JustSay Voice Transaction & AI Integration
 * Tests:
 * 1. Audio Upload & Multer validation
 * 2. Voice Pipeline: Audio → Whisper → Llama → Customer Resolution → PENDING Transaction
 * 3. Human Confirmation Workflow (Confirm PENDING → Balance Updated)
 * 4. Human Cancellation Workflow (Cancel PENDING → Balance Unchanged)
 * 5. Ambiguity Handling: needsClarification → status: "CLARIFY" (Zero DB side effects)
 * 6. Unknown Customer Handling → status: "CLARIFY" (Zero DB side effects)
 * 7. Temporary Upload File Cleanup
 * 8. Conversational Correction Endpoint (/api/voice/correct)
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const http = require('http');
const prisma = require('../src/config/prisma');
const app = require('../src/app');
const aiService = require('../src/services/ai.service');

let passed = 0;
let failed = 0;
let server;
let baseUrl;

function check(desc, condition) {
  if (condition) {
    console.log(`   ✅ ${desc}`);
    passed++;
  } else {
    console.error(`   ❌ FAIL: ${desc}`);
    failed++;
    throw new Error(`Assertion failed: ${desc}`);
  }
}

// Multipart/form-data generator helper for raw HTTP audio uploads without external deps
function createMultipartFormData(boundary, fileField, filename, fileBuffer, mimeType) {
  const crlf = '\r\n';
  const header = `--${boundary}${crlf}Content-Disposition: form-data; name="${fileField}"; filename="${filename}"${crlf}Content-Type: ${mimeType}${crlf}${crlf}`;
  const footer = `${crlf}--${boundary}--${crlf}`;

  return Buffer.concat([
    Buffer.from(header, 'utf8'),
    fileBuffer,
    Buffer.from(footer, 'utf8')
  ]);
}

async function makeMultipartRequest(endpoint, fileBuffer, filename = 'test.wav', mimeType = 'audio/wav') {
  const boundary = '----JustSayTestBoundary' + Date.now();
  const body = createMultipartFormData(boundary, 'audio', filename, fileBuffer, mimeType);

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const req = http.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length
        }
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: resData ? JSON.parse(resData) : null
            });
          } catch (e) {
            resolve({ status: res.statusCode, rawBody: resData });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function makeJsonRequest(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, baseUrl);
    const bodyStr = data ? JSON.stringify(data) : '';
    const req = http.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr)
        }
      },
      (res) => {
        let resData = '';
        res.on('data', (chunk) => (resData += chunk));
        res.on('end', () => {
          try {
            resolve({
              status: res.statusCode,
              body: resData ? JSON.parse(resData) : null
            });
          } catch (e) {
            resolve({ status: res.statusCode, rawBody: resData });
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Starting Voice Transaction & AI Integration Test Suite...\n');

  // Start HTTP test server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  // Ensure Ravi and Mani exist in DB for deterministic testing
  let ravi = await prisma.customer.findFirst({ where: { name: 'Ravi' } });
  if (!ravi) {
    ravi = await prisma.customer.create({ data: { name: 'Ravi', balance: 0 } });
  } else {
    await prisma.customer.update({ where: { id: ravi.id }, data: { balance: 0 } });
  }

  let mani = await prisma.customer.findFirst({ where: { name: 'Mani' } });
  if (!mani) {
    mani = await prisma.customer.create({ data: { name: 'Mani', balance: 0 } });
  } else {
    await prisma.customer.update({ where: { id: mani.id }, data: { balance: 0 } });
  }

  // Count initial transactions
  const initialTxCount = await prisma.transaction.count();

  // Create a dummy WAV buffer for testing
  const dummyWavBuffer = Buffer.from('RIFF....WAVEfmt ....data....', 'utf8');

  // Save original AI functions so we can mock & test deterministically
  const originalTranscribe = aiService.transcribeAudio;
  const originalExtract = aiService.extractTransaction;
  const originalCorrect = aiService.correctTransaction;

  try {
    // -------------------------------------------------------------
    // TEST 1: Missing audio upload file
    // -------------------------------------------------------------
    console.log('1. Testing missing audio upload...');
    const noFileRes = await makeJsonRequest('POST', '/api/voice', {});
    check('Missing file returns 400', noFileRes.status === 400);
    check('Error message identifies missing audio file', noFileRes.body?.message?.includes('No audio file uploaded'));

    // -------------------------------------------------------------
    // TEST 2: Valid Credit Voice Transaction
    // Utterance: "Ravi ku 50 rupees paal packet add pannu"
    // -------------------------------------------------------------
    console.log('\n2. Testing valid CREDIT voice transaction (Ravi ₹50)...');
    aiService.transcribeAudio = async () => ({
      rawTranscript: 'Ravi-ku 50 rs paal packet add-pannu',
      normalizedTranscript: 'Ravi ku 50 rupees paal packet add pannu'
    });
    aiService.extractTransaction = async () => ({
      person: 'Ravi',
      nickname: null,
      item: 'paal packet',
      quantity: null,
      amount: 50,
      transactionType: 'CREDIT',
      reference: null,
      confidence: 0.95,
      needsClarification: false,
      clarificationReason: null
    });

    const creditRes = await makeMultipartRequest('/api/voice', dummyWavBuffer);
    check('Credit voice transaction status 201', creditRes.status === 201);
    check('Response has status PENDING', creditRes.body?.data?.status === 'PENDING');
    check('Response contains valid transactionId', !!creditRes.body?.data?.transactionId);
    check('Response contains normalized transcript', creditRes.body?.data?.transcript === 'Ravi ku 50 rupees paal packet add pannu');
    check('Response contains resolved customer Ravi', creditRes.body?.data?.customer?.name === 'Ravi');

    const createdTxId = creditRes.body.data.transactionId;
    const txInDb = await prisma.transaction.findUnique({ where: { id: createdTxId } });
    check('Database transaction is PENDING', txInDb.status === 'PENDING');
    check('Database transaction is not confirmed', txInDb.confirmed === false);
    check('Amount converted to 5000 paise', txInDb.amount === 5000);

    const raviAfterPending = await prisma.customer.findUnique({ where: { id: ravi.id } });
    check('Ravi balance remains 0 while PENDING', raviAfterPending.balance === 0);

    // -------------------------------------------------------------
    // TEST 3: Confirm Pending Transaction
    // -------------------------------------------------------------
    console.log('\n3. Confirming the PENDING transaction via ledger confirm endpoint...');
    const confirmRes = await makeJsonRequest('POST', `/api/ledger/${createdTxId}/confirm`);
    check('Confirm returns 200', confirmRes.status === 200);

    const txAfterConfirm = await prisma.transaction.findUnique({ where: { id: createdTxId } });
    check('Transaction status is now CONFIRMED', txAfterConfirm.status === 'CONFIRMED');
    check('Transaction confirmed boolean is true', txAfterConfirm.confirmed === true);

    const raviAfterConfirm = await prisma.customer.findUnique({ where: { id: ravi.id } });
    check('Ravi balance updated to 5000 paise (₹50)', raviAfterConfirm.balance === 5000);

    // -------------------------------------------------------------
    // TEST 4: Valid Payment Voice Transaction & Cancel Workflow
    // Utterance: "Mani 100 rupees kuduthutaan"
    // -------------------------------------------------------------
    console.log('\n4. Testing valid PAYMENT voice transaction (Mani ₹100) & Cancellation...');
    aiService.transcribeAudio = async () => ({
      rawTranscript: 'Mani 100 rupees kuduthutaan',
      normalizedTranscript: 'Mani 100 rupees kuduthutaan'
    });
    aiService.extractTransaction = async () => ({
      person: 'Mani',
      nickname: null,
      item: null,
      quantity: null,
      amount: 100,
      transactionType: 'PAYMENT',
      reference: null,
      confidence: 0.96,
      needsClarification: false,
      clarificationReason: null
    });

    const paymentRes = await makeMultipartRequest('/api/voice', dummyWavBuffer);
    check('Payment voice transaction status 201', paymentRes.status === 201);
    const paymentTxId = paymentRes.body.data.transactionId;

    const cancelRes = await makeJsonRequest('POST', `/api/ledger/${paymentTxId}/cancel`);
    check('Cancel returns 200', cancelRes.status === 200);

    const txAfterCancel = await prisma.transaction.findUnique({ where: { id: paymentTxId } });
    check('Transaction status is CANCELLED', txAfterCancel.status === 'CANCELLED');

    const maniAfterCancel = await prisma.customer.findUnique({ where: { id: mani.id } });
    check('Mani balance remains 0 after cancellation', maniAfterCancel.balance === 0);

    // -------------------------------------------------------------
    // TEST 5: Ambiguous Voice Input (Needs Clarification)
    // Utterance: "Ravi ku paal packet add pannu" (Missing amount)
    // -------------------------------------------------------------
    console.log('\n5. Testing speech requiring clarification (Missing amount)...');
    aiService.transcribeAudio = async () => ({
      rawTranscript: 'Ravi ku paal packet add pannu',
      normalizedTranscript: 'Ravi ku paal packet add pannu'
    });
    aiService.extractTransaction = async () => ({
      person: 'Ravi',
      nickname: null,
      item: 'paal packet',
      quantity: null,
      amount: null,
      transactionType: 'CREDIT',
      reference: null,
      confidence: 0.7,
      needsClarification: true,
      clarificationReason: 'Amount is missing or ambiguous.'
    });

    const txCountBeforeClarify = await prisma.transaction.count();
    const clarifyRes = await makeMultipartRequest('/api/voice', dummyWavBuffer);
    check('Clarify request returns 200', clarifyRes.status === 200);
    check('Response status is CLARIFY', clarifyRes.body?.data?.status === 'CLARIFY');
    check('Response contains clarificationReason', clarifyRes.body?.data?.clarificationReason?.includes('Amount is missing'));

    const txCountAfterClarify = await prisma.transaction.count();
    check('NO database transaction was created during CLARIFY', txCountBeforeClarify === txCountAfterClarify);

    // -------------------------------------------------------------
    // TEST 6: Unregistered Customer Voice Input
    // -------------------------------------------------------------
    console.log('\n6. Testing unregistered customer resolution...');
    aiService.transcribeAudio = async () => ({
      rawTranscript: 'NonExistentCustomer ku 50 add pannu',
      normalizedTranscript: 'NonExistentCustomer ku 50 rupees add pannu'
    });
    aiService.extractTransaction = async () => ({
      person: 'NonExistentCustomer',
      nickname: null,
      item: null,
      quantity: null,
      amount: 50,
      transactionType: 'CREDIT',
      reference: null,
      confidence: 0.95,
      needsClarification: false,
      clarificationReason: null
    });

    const unknownCustRes = await makeMultipartRequest('/api/voice', dummyWavBuffer);
    check('Unresolved customer returns status CLARIFY', unknownCustRes.body?.data?.status === 'CLARIFY');
    check('Clarification reason mentions customer not found', unknownCustRes.body?.data?.clarificationReason?.includes('No customer found'));

    // -------------------------------------------------------------
    // TEST 7: Upload Temporary File Cleanup
    // -------------------------------------------------------------
    console.log('\n7. Verifying temporary upload file cleanup...');
    const uploadsDir = path.join(__dirname, '../uploads');
    const remainingFiles = fs.readdirSync(uploadsDir).filter((f) => f.startsWith('audio-'));
    check('All temporary audio upload files were cleaned up from uploads directory', remainingFiles.length === 0);

    // -------------------------------------------------------------
    // TEST 8: Conversational Correction Endpoint (/api/voice/correct)
    // -------------------------------------------------------------
    console.log('\n8. Testing conversational correction endpoint (/api/voice/correct)...');
    aiService.correctTransaction = async (draft, correction) => ({
      person: draft.person,
      nickname: draft.nickname,
      item: draft.item,
      quantity: draft.quantity,
      amount: 50,
      transactionType: draft.transactionType,
      reference: null,
      confidence: 0.98,
      needsClarification: false,
      clarificationReason: null
    });

    const currentDraft = {
      person: 'Ravi',
      nickname: null,
      item: 'tea',
      quantity: null,
      amount: 500,
      transactionType: 'CREDIT',
      reference: null,
      confidence: 0.95,
      needsClarification: false,
      clarificationReason: null
    };

    const correctionPayload = {
      currentDraft,
      correctionTranscript: 'No 500 illa, 50 rupees'
    };

    const correctionRes = await makeJsonRequest('POST', '/api/voice/correct', correctionPayload);
    check('Correction returns 200', correctionRes.status === 200);
    check('Correction returns corrected draft object', !!correctionRes.body?.data?.correctedDraft);
    check('Corrected draft has amount 50', correctionRes.body?.data?.correctedDraft?.amount === 50);

    // Cleanup created test transactions
    await prisma.transaction.deleteMany({
      where: {
        id: { in: [createdTxId, paymentTxId] }
      }
    });
    await prisma.customer.update({ where: { id: ravi.id }, data: { balance: 0 } });
    await prisma.customer.update({ where: { id: mani.id }, data: { balance: 0 } });

  } finally {
    // Restore original functions
    aiService.transcribeAudio = originalTranscribe;
    aiService.extractTransaction = originalExtract;
    aiService.correctTransaction = originalCorrect;
    server.close();
  }

  console.log('\n══════════════════════════════════════════════════');
  console.log(`  Voice Integration Results: ${passed} passed, ${failed} failed`);
  console.log('══════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('✅ ALL VOICE INTEGRATION TESTS PASSED PERFECTLY!\n');
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed with unhandled error:', err);
  if (server) server.close();
  process.exit(1);
});
