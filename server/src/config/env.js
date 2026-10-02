const dotenv = require('dotenv');
const { z } = require('zod');

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().optional().default('file:./dev.db'),
  GROQ_API_KEY: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  MOCK_TRANSCRIPTION: z.string().optional().default('false').transform((val) => val.toLowerCase() === 'true'),
  GROQ_WHISPER_MODEL: z.string().optional().default('whisper-large-v3'),
  GROQ_LLAMA_MODEL: z.string().optional().default('llama-3.3-70b-versatile')
});

const parseEnv = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('❌ Invalid environment configuration:', result.error.format());
    process.exit(1);
  }
  return result.data;
};

const env = parseEnv();

module.exports = env;
