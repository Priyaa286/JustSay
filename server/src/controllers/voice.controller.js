const fs = require('fs');
const aiService = require('../services/ai.service');
const customerService = require('../services/customer.service');
const ledgerService = require('../services/ledger.service');
const { sendSuccess } = require('../utils/response');

/**
 * End-to-end voice transaction handler:
 * Audio → Speech-to-Text (Whisper) → Structured Extraction (Llama) → Customer Resolution → PENDING Transaction
 */
const processVoiceTransaction = async (req, res, next) => {
  let filePath = null;

  try {
    if (!req.file) {
      const error = new Error('No audio file uploaded. Please speak again.');
      error.statusCode = 400;
      error.errorCode = 'AUDIO_MISSING';
      error.isPublic = true;
      throw error;
    }

    filePath = req.file.path;

    // 1. Transcribe audio using Sweety's Whisper pipeli

    console.log('🎤 AUDIO FILE:', filePath);
    console.log('📦 AUDIO SIZE:', fs.statSync(filePath).size);
    console.log('🔍 AUDIO HEADER:', fs.readFileSync(filePath).subarray(0, 16).toString('hex'));

    const transcriptionResult = await aiService.transcribeAudio(filePath);
    const normalizedTranscript = (transcriptionResult.normalizedTranscript || transcriptionResult.transcript || '').trim();

    if (!normalizedTranscript) {
      return sendSuccess(res, 'No speech detected in audio', {
        status: 'CLARIFY',
        transcript: '',
        extraction: null,
        clarificationReason: 'No speech detected in audio.'
      }, 200);
    }

    // 2. Extract structured transaction using Sweety's Llama pipeline
    const extractedData = await aiService.extractTransaction(normalizedTranscript);

    // 3. If information is missing or ambiguous, return CLARIFY (DO NOT create DB transaction)
    if (extractedData.needsClarification) {
      return sendSuccess(res, 'Transaction requires clarification', {
        status: 'CLARIFY',
        transcript: normalizedTranscript,
        extraction: extractedData,
        clarificationReason: extractedData.clarificationReason || 'Transaction details are incomplete or ambiguous.'
      }, 200);
    }

    // 4. Resolve customer by name or nickname
    let customer;
    try {
      customer = await customerService.resolveCustomerByName(extractedData.person);
    } catch (resolveError) {
      if (resolveError.code === 'CUSTOMER_NOT_FOUND') {
        return sendSuccess(res, 'New customer detected', {
          status: 'NEW_CUSTOMER_DETECTED',
          transcript: normalizedTranscript,
          extraction: extractedData,
          customer: { name: extractedData.person }
        }, 200);
      }

      // Ambiguous customer -> DO NOT create transaction, return CLARIFY
      return sendSuccess(res, 'Customer could not be resolved', {
        status: 'CLARIFY',
        transcript: normalizedTranscript,
        extraction: extractedData,
        clarificationReason: resolveError.message
      }, 200);
    }

    // 5. Create PENDING transaction in ledger (does NOT update balance)
    const pendingTransaction = await ledgerService.createTransaction({
      customerId: customer.id,
      item: extractedData.item,
      quantity: extractedData.quantity,
      amount: extractedData.amount, // in RUPEES
      type: extractedData.transactionType,
      transcript: normalizedTranscript
    });

    // 6. Return PENDING transaction awaiting vendor confirmation
    return sendSuccess(res, 'Voice transaction processed and awaiting confirmation', {
      status: 'PENDING',
      transactionId: pendingTransaction.id,
      transcript: normalizedTranscript,
      extraction: extractedData,
      customer: {
        id: customer.id,
        name: customer.name,
        nickname: customer.nickname,
        balancePaise: customer.balance,
        balanceRupees: customer.balance / 100
      },
      transaction: pendingTransaction
    }, 201);
  } catch (error) {
    next(error);
  } finally {
    // Guaranteed cleanup of uploaded temporary audio file
    if (filePath && fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        console.error('⚠️ Failed to delete temporary audio file:', cleanupError.message);
      }
    }
  }
};

/**
 * Applies a conversational correction to a draft transaction
 * Does NOT modify the database. Returns corrected draft for vendor confirmation.
 */
const correctVoiceTransaction = async (req, res, next) => {
  try {
    const currentDraft = req.body.currentDraft || req.body.draft;
    const correctionTranscript = req.body.correctionTranscript || req.body.transcript;

    if (!currentDraft || typeof currentDraft !== 'object') {
      const error = new Error('currentDraft object is required for correction.');
      error.statusCode = 400;
      throw error;
    }

    if (!correctionTranscript || typeof correctionTranscript !== 'string' || correctionTranscript.trim().length === 0) {
      const error = new Error('correctionTranscript string is required.');
      error.statusCode = 400;
      throw error;
    }

    const correctedDraft = await aiService.correctTransaction(currentDraft, correctionTranscript);

    return sendSuccess(res, 'Transaction draft corrected successfully', {
      status: correctedDraft.needsClarification ? 'CLARIFY' : 'DRAFT',
      correctedDraft,
      needsClarification: correctedDraft.needsClarification,
      clarificationReason: correctedDraft.clarificationReason
    }, 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  processVoiceTransaction,
  correctVoiceTransaction
};
