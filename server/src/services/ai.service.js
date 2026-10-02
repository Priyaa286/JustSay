const path = require('path');
const { pathToFileURL } = require('url');
const env = require('../config/env');

let aiEnginePromise = null;

/**
 * Lazily loads Sweety's AI Engine module from ai/src/index.js
 */
const getAiEngine = async () => {
  if (!aiEnginePromise) {
    const aiModulePath = path.resolve(__dirname, '../../../ai/src/index.js');
    const fileUrl = pathToFileURL(aiModulePath).href;
    aiEnginePromise = import(fileUrl);
  }
  return await aiEnginePromise;
};

/**
 * Transcribes audio using Sweety's transcribeAudio function
 * @param {string} filePath - Absolute or relative path to the temporary audio file
 * @param {object} [options={}] - Optional transcription options
 */
const transcribeAudio = async (filePath, options = {}) => {
  if (env.MOCK_TRANSCRIPTION) {
    return {
      rawTranscript: 'Ravi-ku 50 rs paal packet add-pannu',
      normalizedTranscript: 'Ravi ku 50 rupees paal packet add pannu',
      language: 'ta',
      duration: 3.5
    };
  }

  const ai = await getAiEngine();
  try {
    const result = await ai.transcribeAudio(filePath, {
      model: env.GROQ_WHISPER_MODEL,
      ...options
    });
    return result;
  } catch (error) {
    console.error('❌ AI Speech-to-Text Error:', error.message);
    const err = new Error(error.message || 'Speech-to-text transcription failed.');
    err.statusCode = error.status || 500;
    throw err;
  }
};

/**
 * Extracts structured transaction data using Sweety's extractTransaction function
 * @param {string} transcript - Normalized spoken vendor utterance
 * @param {object} [context=null] - Optional store or customer context
 * @param {object} [options={}] - Optional extraction options
 */
const extractTransaction = async (transcript, context = null, options = {}) => {
  if (env.MOCK_TRANSCRIPTION) {
    if (transcript.includes('Ravi ku 50 rupees paal packet add pannu')) {
      return {
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
      };
    }
    if (transcript.includes('Mani 100 rupees kuduthutaan')) {
      return {
        person: 'Mani',
        nickname: null,
        item: null,
        quantity: null,
        amount: 100,
        transactionType: 'PAYMENT',
        reference: null,
        confidence: 0.95,
        needsClarification: false,
        clarificationReason: null
      };
    }
    if (transcript.includes('Ravi ku paal packet add pannu')) {
      return {
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
      };
    }
  }

  const ai = await getAiEngine();
  try {
    const result = await ai.extractTransaction(transcript, context, {
      model: env.GROQ_LLAMA_MODEL,
      ...options
    });
    return result;
  } catch (error) {
    console.error('❌ AI Extraction Error:', error.message);
    const err = new Error(error.message || 'Structured transaction extraction failed.');
    err.statusCode = error.status || 500;
    throw err;
  }
};

/**
 * Applies conversational correction to an existing transaction draft
 * @param {object} currentDraft - Existing extracted draft transaction
 * @param {string} correctionTranscript - Spoken correction transcript
 * @param {object} [options={}] - Optional model options
 */
const correctTransaction = async (currentDraft, correctionTranscript, options = {}) => {
  if (env.MOCK_TRANSCRIPTION) {
    return {
      person: currentDraft.person || 'Ravi',
      nickname: currentDraft.nickname || null,
      item: currentDraft.item || null,
      quantity: currentDraft.quantity || null,
      amount: 50,
      transactionType: currentDraft.transactionType || 'CREDIT',
      reference: null,
      confidence: 0.95,
      needsClarification: false,
      clarificationReason: null
    };
  }

  const ai = await getAiEngine();
  try {
    const result = await ai.correctTransaction(currentDraft, correctionTranscript, {
      model: env.GROQ_LLAMA_MODEL,
      ...options
    });
    return result;
  } catch (error) {
    console.error('❌ AI Correction Error:', error.message);
    const err = new Error(error.message || 'Transaction draft correction failed.');
    err.statusCode = error.status || 500;
    throw err;
  }
};


module.exports = {
  getAiEngine,
  transcribeAudio,
  extractTransaction,
  correctTransaction
};
