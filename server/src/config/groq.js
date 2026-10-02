const Groq = require('groq-sdk');
const env = require('./env');

let groqInstance = null;

const getGroqClient = () => {
  if (!groqInstance) {
    if (!env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY is not configured in environment.');
    }
    groqInstance = new Groq({
      apiKey: env.GROQ_API_KEY || 'DUMMY_KEY_FOR_MOCK_OR_LAZY_INIT'
    });
  }
  return groqInstance;
};

module.exports = getGroqClient;
