import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribeAudio, DEFAULT_WHISPER_PROMPT } from '../src/services/transcriptionService.js';
import { normalizeTranscript } from '../src/utils/normalizeTranscript.js';

test('Transcription Service - Validates missing audio input', async () => {
  await assert.rejects(
    async () => {
      await transcribeAudio(null);
    },
    {
      name: 'Error',
      message: /requires a valid audio file path/
    }
  );
});

test('Transcription Service - Validates non-existent audio file path', async () => {
  await assert.rejects(
    async () => {
      await transcribeAudio('non_existent_audio_sample.wav');
    },
    {
      name: 'Error',
      message: /Audio file not found at path/
    }
  );
});

test('Transcription Service - Default Whisper prompt priming vocabulary', () => {
  assert.ok(DEFAULT_WHISPER_PROMPT.includes('Tamil Tanglish'));
  assert.ok(DEFAULT_WHISPER_PROMPT.includes('add pannu'));
  assert.ok(DEFAULT_WHISPER_PROMPT.includes('kuduthaan'));
  assert.ok(DEFAULT_WHISPER_PROMPT.includes('credit'));
  assert.ok(DEFAULT_WHISPER_PROMPT.includes('payment'));
});

test('Transcription Service - Post-transcription normalization pipeline', () => {
  const simulatedRawTranscript = '  Ravi-ku   100  rs.   add-pannu  ';
  const cleaned = normalizeTranscript(simulatedRawTranscript);
  assert.equal(cleaned, 'Ravi ku 100 rupees add pannu');
});
