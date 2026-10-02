const fs = require('fs');
const getGroqClient = require('../config/groq');
const env = require('../config/env');

const transcribeAudio = async (filePath) => {
  // If mock mode is explicitly enabled
  if (env.MOCK_TRANSCRIPTION) {
    return {
      transcript: 'Ravi ku 50 rupees paal packet add pannu'
    };
  }

  if (!env.GROQ_API_KEY) {
    const error = new Error('Groq API Key is not configured on the server. Please set GROQ_API_KEY in .env or enable MOCK_TRANSCRIPTION=true.');
    error.statusCode = 500;
    throw error;
  }

  if (!fs.existsSync(filePath)) {
    const error = new Error('Uploaded audio file was not found on server.');
    error.statusCode = 400;
    throw error;
  }

  const groq = getGroqClient();

  try {
    const fileStream = fs.createReadStream(filePath);

    const response = await groq.audio.transcriptions.create({
      file: fileStream,
      model: 'whisper-large-v3',
      prompt: 'Tamil and Tanglish speech for Indian street vendors ledger recording customer transactions, rupees, and grocery items.',
      response_format: 'json',
      language: 'ta',
      temperature: 0
    });

    return {
      transcript: response.text ? response.text.trim() : ''
    };
  } catch (error) {
    console.error('❌ Groq Whisper API Error:', error.message);
    const err = new Error(error.message || 'Groq speech-to-text transcription failed.');
    err.statusCode = error.status || 500;
    throw err;
  }
};

module.exports = {
  transcribeAudio
};
