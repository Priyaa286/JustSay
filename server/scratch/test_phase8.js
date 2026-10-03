const app = require('../src/app');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');

async function testPhase8() {
  console.log('🧪 Starting Phase 8 (Error Handling) Verification Test suite...\n');

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

  const dummyAudioPath = path.join(__dirname, 'dummy.webm');
  fs.writeFileSync(dummyAudioPath, 'dummy content');

  const server = app.listen(5007, async () => {
    try {
      const baseUrl = 'http://localhost:5007';

      // 1. Missing Audio
      console.log('1. Testing missing audio...');
      const noAudioRes = await fetch(`${baseUrl}/api/voice`, {
        method: 'POST'
      });
      const noAudioData = await noAudioRes.json();
      assert('No audio status', noAudioRes.status, 400);
      assert('No audio code', noAudioData.errorCode, 'AUDIO_MISSING');

      // Setup mock AI errors
      const aiService = require('../src/services/ai.service');
      const origExtract = aiService.extractTransaction;

      const fd = () => {
        const f = new FormData();
        f.append('audio', fs.createReadStream(dummyAudioPath));
        return {
          body: f,
          headers: f.getHeaders()
        };
      };

      // 2. Groq 429
      console.log('\n2. Testing simulated Groq 429...');
      aiService.extractTransaction = async () => {
        const err = new Error('Rate limit');
        err.status = 429;
        throw err;
      };
      const r429 = fd();
      const res429 = await fetch(`${baseUrl}/api/voice`, { method: 'POST', headers: r429.headers, body: r429.body });
      const data429 = await res429.json();
      assert('429 status', res429.status, 429);
      assert('429 code', data429.errorCode, 'AI_RATE_LIMITED');
      assert('429 friendly message', data429.message, 'Voice service is currently busy. Please wait a moment and try again.');

      // 3. Groq 500
      console.log('\n3. Testing simulated Groq 5xx...');
      aiService.extractTransaction = async () => {
        const err = new Error('Server error');
        err.status = 503;
        throw err;
      };
      const r5xx = fd();
      const res5xx = await fetch(`${baseUrl}/api/voice`, { method: 'POST', headers: r5xx.headers, body: r5xx.body });
      const data5xx = await res5xx.json();
      assert('5xx status', res5xx.status, 500);
      assert('5xx code', data5xx.errorCode, 'AI_UNAVAILABLE');

      // 4. Groq Timeout
      console.log('\n4. Testing simulated Groq Timeout...');
      aiService.extractTransaction = async () => {
        const err = new Error('Timeout');
        err.code = 'ECONNABORTED';
        throw err;
      };
      const rTimeout = fd();
      const resTimeout = await fetch(`${baseUrl}/api/voice`, { method: 'POST', headers: rTimeout.headers, body: rTimeout.body });
      const dataTimeout = await resTimeout.json();
      assert('Timeout code', dataTimeout.errorCode, 'AI_TIMEOUT');

      // Restore AI
      aiService.extractTransaction = origExtract;

      // Summary
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`  Phase 8 API Results: ${passed} passed, ${failed} failed`);
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

testPhase8();
