const fs = require('fs');
const transcriptionService = require('../services/transcription.service');
const { sendSuccess } = require('../utils/response');

const transcribe = async (req, res, next) => {
  let filePath = null;

  try {
    if (!req.file) {
      const error = new Error('No audio file uploaded. Please send audio file in "audio" field.');
      error.statusCode = 400;
      throw error;
    }

    filePath = req.file.path;

    const result = await transcriptionService.transcribeAudio(filePath);

    return sendSuccess(res, 'Audio transcribed successfully', result, 200);
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

module.exports = {
  transcribe
};
