/**
 * JustSay AI Engine - Root Module Entrypoint
 * Voice-First AI Ledger for Street Vendors and Kirana Shopkeepers
 *
 * Responsibilities:
 * 1. Speech-to-Text (Groq Whisper Large-v3)
 * 2. Tamil/Tanglish/Code-switched Extraction (Groq Llama 3.3 70B)
 * 3. Zod Structured Validation
 * 4. Conversational Corrections
 *
 * (Isolated from SQLite, Prisma, and Ledger business logic)
 */

export { transcribeAudio, DEFAULT_WHISPER_PROMPT } from './services/transcriptionService.js';
export { extractTransaction, correctTransaction } from './services/extractionService.js';
export { getGroqClient, resetGroqClient, MODELS } from './services/groqService.js';
export { TransactionSchema, ReferenceSchema, TransactionTypeSchema } from './schemas/transactionSchema.js';
export { RawExtractionSchema, enforceSafetyInvariants } from './schemas/extractionSchema.js';
export { normalizeTranscript, normalizeTamilNumbers } from './utils/normalizeTranscript.js';
export { EXTRACTION_SYSTEM_PROMPT, buildExtractionMessages } from './prompts/extractionPrompt.js';
export { CORRECTION_SYSTEM_PROMPT, buildCorrectionMessages } from './prompts/correctionPrompt.js';

import { transcribeAudio } from './services/transcriptionService.js';
import { extractTransaction, correctTransaction } from './services/extractionService.js';
import { TransactionSchema } from './schemas/transactionSchema.js';

export default {
  transcribeAudio,
  extractTransaction,
  correctTransaction,
  TransactionSchema
};
