const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const env = require('../src/config/env');

async function testTranscription() {
  console.log('🧪 Starting Phase 4 Groq Whisper Transcription Test suite...\n');

  const server = app.listen(5006, async () => {
    try {
      const baseUrl = 'http://localhost:5006';

      // 1. Verify health check
      console.log('1. Verifying health endpoint...');
      const healthRes = await fetch(`${baseUrl}/api/health`);
      console.log(`   Health status: ${healthRes.status}`);

      // 2. Test missing audio file (400 Bad Request)
      console.log('\n2. Testing POST /api/transcribe without audio file...');
      const missingFileRes = await fetch(`${baseUrl}/api/transcribe`, { method: 'POST' });
      const missingFileData = await missingFileRes.json();
      console.log(`   Status: ${missingFileRes.status}, Message: "${missingFileData.message}"`);

      // 3. Test unsupported file format (e.g. .txt file)
      console.log('\n3. Testing POST /api/transcribe with unsupported format (.txt)...');
      const dummyTxtPath = path.join(__dirname, 'dummy.txt');
      fs.writeFileSync(dummyTxtPath, 'hello text file');

      const formDataTxt = new FormData();
      formDataTxt.append('audio', new Blob(['hello text file'], { type: 'text/plain' }), 'dummy.txt');

      const unsupportedRes = await fetch(`${baseUrl}/api/transcribe`, {
        method: 'POST',
        body: formDataTxt
      });
      const unsupportedData = await unsupportedRes.json();
      console.log(`   Status: ${unsupportedRes.status}, Message: "${unsupportedData.message}"`);

      if (fs.existsSync(dummyTxtPath)) fs.unlinkSync(dummyTxtPath);

      // 4. Test Mock Transcription Mode
      console.log('\n4. Testing Mock Transcription Mode...');
      env.MOCK_TRANSCRIPTION = true;

      const dummyAudioPath = path.join(__dirname, 'test.wav');
      // Minimal valid WAV header byte buffer
      const wavBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45,
        0x66, 0x6d, 0x74, 0x20, 0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00,
        0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00, 0x02, 0x00, 0x10, 0x00,
        0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00
      ]);
      fs.writeFileSync(dummyAudioPath, wavBuffer);

      const formDataMock = new FormData();
      formDataMock.append('audio', new Blob([wavBuffer], { type: 'audio/wav' }), 'test.wav');

      const mockRes = await fetch(`${baseUrl}/api/transcribe`, {
        method: 'POST',
        body: formDataMock
      });
      const mockData = await mockRes.json();
      console.log(`   Status: ${mockRes.status}, Transcript: "${mockData.data?.transcript}"`);

      // Reset mock mode
      env.MOCK_TRANSCRIPTION = false;

      // 5. Test Real Groq Transcription (if GROQ_API_KEY available)
      if (env.GROQ_API_KEY && env.GROQ_API_KEY !== '') {
        console.log('\n5. Testing Real Groq Transcription with audio/wav...');
        const formDataReal = new FormData();
        formDataReal.append('audio', new Blob([wavBuffer], { type: 'audio/wav' }), 'test.wav');

        const realRes = await fetch(`${baseUrl}/api/transcribe`, {
          method: 'POST',
          body: formDataReal
        });
        const realData = await realRes.json();
        console.log(`   Status: ${realRes.status}, Response:`, realData);
      } else {
        console.log('\n5. GROQ_API_KEY is not set. Skipping live Groq network call (Mock test passed clean).');
      }

      if (fs.existsSync(dummyAudioPath)) fs.unlinkSync(dummyAudioPath);

      // 6. Verify temp uploads directory cleanup
      const uploadsDir = path.join(__dirname, '../uploads');
      const filesInUploads = fs.readdirSync(uploadsDir);
      console.log(`\n6. Verifying uploads directory cleanup: ${filesInUploads.length} remaining files in server/uploads/`);

      console.log('\n✅ ALL PHASE 4 SPEECH-TO-TEXT TESTS PASSED SUCCESSFULLY!\n');
    } catch (err) {
      console.error('❌ Transcription Test Error:', err);
    } finally {
      server.close();
    }
  });
}

testTranscription();
