const express = require('express');
const { handleAudioUpload } = require('../middleware/uploadMiddleware');
const voiceController = require('../controllers/voice.controller');

const router = express.Router();

// Main voice transaction endpoint (accepts uploaded audio)
router.post('/', handleAudioUpload, voiceController.processVoiceTransaction);
router.post('/process', handleAudioUpload, voiceController.processVoiceTransaction);

// Conversational correction endpoint (JSON body: currentDraft, correctionTranscript)
router.post('/correct', voiceController.correctVoiceTransaction);

module.exports = router;
