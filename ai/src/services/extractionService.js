import { getGroqClient, MODELS } from './groqService.js';
import { buildExtractionMessages } from '../prompts/extractionPrompt.js';
import { buildCorrectionMessages } from '../prompts/correctionPrompt.js';
import { RawExtractionSchema, enforceSafetyInvariants } from '../schemas/extractionSchema.js';
import { normalizeTranscript } from '../utils/normalizeTranscript.js';

/**
 * Extracts a structured transaction from raw speech transcript using Llama 3.3 70B
 *
 * @param {string} transcript - Spoken vendor utterance
 * @param {object} [context=null] - Optional backend context (e.g. prior transactions, customer ID)
 * @param {object} [options={}] - Optional overrides (model, temperature)
 * @returns {Promise<import('../schemas/transactionSchema.js').TransactionSchema>} Validated transaction object
 */
export async function extractTransaction(transcript, context = null, options = {}) {
  if (!transcript || typeof transcript !== 'string' || transcript.trim().length === 0) {
    return enforceSafetyInvariants({
      person: null,
      nickname: null,
      item: null,
      quantity: null,
      amount: null,
      transactionType: null,
      reference: null,
      confidence: 0.0,
      needsClarification: true,
      clarificationReason: 'Transcript is empty or blank.'
    });
  }

  const normalized = normalizeTranscript(transcript);
  const messages = buildExtractionMessages(normalized, context);
  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    model: options.model || MODELS.EXTRACTION,
    messages: messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.1,
    response_format: { type: 'json_object' }
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Groq returned empty response during transaction extraction.');
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (err) {
    throw new Error(`Failed to parse LLM extraction JSON: ${err.message}. Raw output: ${rawContent}`);
  }

  const rawValidated = RawExtractionSchema.parse(parsedJson);
  const finalTransaction = enforceSafetyInvariants(rawValidated);

  return finalTransaction;
}

/**
 * Applies a conversational correction to a draft transaction
 * e.g., Vendor says: "No 500 illa, 50"
 *
 * @param {object} currentDraft - Existing draft transaction JSON
 * @param {string} correctionTranscript - Vendor's correction speech
 * @param {object} [options={}] - Optional overrides
 * @returns {Promise<import('../schemas/transactionSchema.js').TransactionSchema>} Updated transaction
 */
export async function correctTransaction(currentDraft, correctionTranscript, options = {}) {
  if (!currentDraft) {
    throw new Error('correctTransaction requires a valid currentDraft object.');
  }
  if (!correctionTranscript || typeof correctionTranscript !== 'string') {
    return currentDraft;
  }

  const normalizedCorrection = normalizeTranscript(correctionTranscript);
  const messages = buildCorrectionMessages(currentDraft, normalizedCorrection);
  const groq = getGroqClient();

  const completion = await groq.chat.completions.create({
    model: options.model || MODELS.EXTRACTION,
    messages: messages,
    temperature: options.temperature !== undefined ? options.temperature : 0.1,
    response_format: { type: 'json_object' }
  });

  const rawContent = completion.choices[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Groq returned empty response during correction.');
  }

  let parsedJson;
  try {
    parsedJson = JSON.parse(rawContent);
  } catch (err) {
    throw new Error(`Failed to parse LLM correction JSON: ${err.message}. Raw output: ${rawContent}`);
  }

  const rawValidated = RawExtractionSchema.parse(parsedJson);
  const finalTransaction = enforceSafetyInvariants(rawValidated);

  return finalTransaction;
}

export default {
  extractTransaction,
  correctTransaction
};
