import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from closest .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const MODELS = {
  TRANSCRIPTION: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
  EXTRACTION: process.env.GROQ_LLAMA_MODEL || 'llama-3.3-70b-versatile'
};

let groqInstance = null;

/**
 * Gets or initializes the Groq SDK client instance
 * @returns {Groq} Initialized Groq client
 */
export function getGroqClient() {
  if (groqInstance) {
    return groqInstance;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error(
      'GROQ_API_KEY is not configured in environment variables or .env file. ' +
      'Please set GROQ_API_KEY to your valid Groq API key.'
    );
  }

  groqInstance = new Groq({
    apiKey: apiKey
  });

  return groqInstance;
}

/**
 * Reset Groq client (useful for testing or switching keys)
 */
export function resetGroqClient() {
  groqInstance = null;
}

export default {
  getGroqClient,
  resetGroqClient,
  MODELS
};
