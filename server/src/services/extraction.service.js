const aiService = require('./ai.service');
const env = require('../config/env');

/**
 * Extracts structured transaction data from a spoken transcript using Sweety's AI Engine.
 */
const extractFromTranscript = async (transcript, context = null) => {
  // If mock mode is explicitly enabled
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
    if (transcript.includes('Suresh ku rendu biscuit packet 40 rupees')) {
      return {
        person: 'Suresh',
        nickname: null,
        item: 'biscuit packet',
        quantity: 2,
        amount: 40,
        transactionType: 'CREDIT',
        reference: null,
        confidence: 0.95,
        needsClarification: false,
        clarificationReason: null
      };
    }
    if (transcript.includes('Ravi ku 50 rupees') && !transcript.includes('paal packet') && !transcript.includes('add') && !transcript.includes('kuduth')) {
      return {
        person: 'Ravi',
        nickname: null,
        item: null,
        quantity: null,
        amount: 50,
        transactionType: null,
        reference: null,
        confidence: 0.6,
        needsClarification: true,
        clarificationReason: 'Transaction type (CREDIT or PAYMENT) is unclear.'
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
    return {
      person: null,
      nickname: null,
      item: null,
      quantity: null,
      amount: null,
      transactionType: null,
      reference: null,
      confidence: 0.0,
      needsClarification: true,
      clarificationReason: 'Customer identity/person is missing or ambiguous. Amount is missing or ambiguous. Transaction type (CREDIT or PAYMENT) is unclear.'
    };
  }

  return await aiService.extractTransaction(transcript, context);
};

module.exports = {
  extractFromTranscript
};
