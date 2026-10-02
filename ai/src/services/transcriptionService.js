import fs from 'fs';
import { getGroqClient, MODELS } from './groqService.js';
import { normalizeTranscript } from '../utils/normalizeTranscript.js';

// Domain-specific prompt to prime Whisper Large-v3 for Tanglish / Kirana terminology
export const DEFAULT_WHISPER_PROMPT =
  'Tamil Tanglish Kirana ledger: Ravi-ku, Mani-ku, Suresh, add pannu, podu, kuduthaan, kuduthutaan, ' +
  'rupees, tea, milk packet, account la, side-la, credit, payment, settle pannu, balance.';

/**
 * Transcribes audio using Groq Whisper Large-v3
 *
 * @param {string|fs.ReadStream|Blob} audioSource - File path string, Readable Stream, or Blob/File
 * @param {object} [options={}] - Optional configuration
 * @param {string} [options.language] - Optional ISO 639-1 language code (e.g. 'ta', 'en') or leave auto
 * @param {string} [options.prompt] - Optional vocabulary prompt override
 * @param {number} [options.temperature=0.0] - Sampling temperature (0.0 for deterministic decoding)
 * @returns {Promise<{ rawTranscript: string, normalizedTranscript: string, language?: string, duration?: number }>}
 */
export async function transcribeAudio(audioSource, options = {}) {
  if (!audioSource) {
    throw new Error('transcribeAudio requires a valid audio file path, buffer, or stream.');
  }

  let fileStream;
  let shouldCloseStream = false;

  if (typeof audioSource === 'string') {
    if (!fs.existsSync(audioSource)) {
      throw new Error(`Audio file not found at path: ${audioSource}`);
    }
    fileStream = fs.createReadStream(audioSource);
    shouldCloseStream = true;
  } else {
    fileStream = audioSource;
  }

  try {
    const groq = getGroqClient();

    const response = await groq.audio.transcriptions.create({
      file: fileStream,
      model: options.model || MODELS.TRANSCRIPTION,
      prompt: options.prompt !== undefined ? options.prompt : DEFAULT_WHISPER_PROMPT,
      temperature: options.temperature !== undefined ? options.temperature : 0.0,
      response_format: 'verbose_json',
      language: options.language
    });

    const rawTranscript = response.text || '';
    const normalized = normalizeTranscript(rawTranscript);

    return {
      rawTranscript,
      normalizedTranscript: normalized,
      language: response.language || null,
      duration: response.duration || null
    };
  } finally {
    if (shouldCloseStream && fileStream && typeof fileStream.destroy === 'function') {
      fileStream.destroy();
    }
  }
}

export default {
  transcribeAudio,
  DEFAULT_WHISPER_PROMPT
};
