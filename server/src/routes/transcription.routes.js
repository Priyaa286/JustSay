const express = require('express');
const { handleAudioUpload } = require('../middleware/uploadMiddleware');
const transcriptionController = require('../controllers/transcription.controller');

const router = express.Router();


router.post('/', handleAudioUpload, transcriptionController.transcribe);

module.exports = router;
