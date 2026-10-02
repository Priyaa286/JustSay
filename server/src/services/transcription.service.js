const fs = require('fs');
const aiService = require('./ai.service');
const env = require('../config/env');

const transcribeAudio = async (filePath) => {
  // If mock mode is explicitly enabled
  if (env.MOCK_TRANSCRIPTION) {
    return {
      transcript: 'Ravi ku 50 rupees paal packet add pannu',
      rawTranscript: 'Ravi ku 50 rupees paal packet add pannu',
      normalizedTranscript: 'Ravi ku 50 rupees paal packet add pannu'
    };
  }

  if (!fs.existsSync(filePath)) {
    const error = new Error('Uploaded audio file was not found on server.');
    error.statusCode = 400;
    throw error;
  }

  const result = await aiService.transcribeAudio(filePath);
  return {
    transcript: result.normalizedTranscript || result.rawTranscript || '',
    rawTranscript: result.rawTranscript,
    normalizedTranscript: result.normalizedTranscript,
    language: result.language,
    duration: result.duration
  };
};

module.exports = {
  transcribeAudio
};
