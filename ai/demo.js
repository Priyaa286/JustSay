import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeTranscript } from './src/utils/normalizeTranscript.js';
import { TransactionSchema } from './src/schemas/transactionSchema.js';
import { RawExtractionSchema, enforceSafetyInvariants } from './src/schemas/extractionSchema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const hasGroqKey = process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== 'your_groq_api_key_here';

console.log('='.repeat(60));
console.log('  JUSTSAY AI ENGINE — KIRANA & STREET VENDOR DEMO');
console.log('='.repeat(60));

if (hasGroqKey) {
  console.log('✔ Groq API Key detected. Running in LIVE LLM Mode (Llama 3.3 70B)\n');
} else {
  console.log('ℹ No Groq API Key set in .env.');
  console.log('ℹ Running in SAFE SIMULATION Mode with local Normalizer & Invariant Guardrails.\n');
  console.log('👉 To enable live Groq calls, add your key to ai/.env: GROQ_API_KEY=gsk_...\n');
}

async function runDemo() {
  const customInput = process.argv.slice(2).join(' ');

  if (customInput) {
    console.log(`Testing custom vendor utterance: "${customInput}"`);
    await processUtterance(customInput);
    return;
  }

  // Pre-configured benchmark scenarios
  const scenarios = [
    {
      title: 'Scenario 1: Direct Credit in Tanglish',
      speech: 'Ravi ku 50 rupees add pannu',
      simulatedRaw: {
        person: 'Ravi',
        amount: 50,
        transactionType: 'CREDIT',
        confidence: 0.98
      }
    },
    {
      title: 'Scenario 2: Direct Payment in Tanglish',
      speech: 'Ravi 100 kuduthutaan',
      simulatedRaw: {
        person: 'Ravi',
        amount: 100,
        transactionType: 'PAYMENT',
        confidence: 0.97
      }
    },
    {
      title: 'Scenario 3: Informal Item without Amount (Safety Rule Check)',
      speech: 'Mani-ku tea add pannu',
      simulatedRaw: {
        person: 'Mani',
        item: 'tea',
        quantity: 1,
        amount: null,
        transactionType: 'CREDIT',
        confidence: 0.92,
        needsClarification: true,
        clarificationReason: 'Amount is missing for tea.'
      }
    },
    {
      title: 'Scenario 4: Relative Reference (Context Check)',
      speech: 'same as last time',
      simulatedRaw: {
        person: null,
        amount: null,
        transactionType: null,
        reference: {
          type: 'PREVIOUS_TRANSACTION',
          value: 'same as last time'
        },
        confidence: 0.88,
        needsClarification: true,
        clarificationReason: 'Relative reference requires vendor confirmation or context.'
      }
    },
    {
      title: 'Scenario 5: Vendor Correction Flow',
      speech: 'Correction: "No 500 illa, 50" (applied to draft of ₹500)',
      isCorrection: true,
      draft: { person: 'Ravi', amount: 500, transactionType: 'CREDIT' },
      correctionText: 'No 500 illa, 50',
      simulatedRaw: {
        person: 'Ravi',
        amount: 50,
        transactionType: 'CREDIT',
        confidence: 0.98
      }
    }
  ];

  for (const s of scenarios) {
    console.log('-'.repeat(60));
    console.log(`📌 ${s.title}`);
    console.log(`🎙  Vendor Utterance: "${s.speech}"`);

    if (s.isCorrection) {
      if (hasGroqKey) {
        const { correctTransaction } = await import('./src/services/extractionService.js');
        const result = await correctTransaction(s.draft, s.correctionText);
        console.log('🤖 AI Extracted (Live Llama 3.3 70B):');
        console.log(JSON.stringify(result, null, 2));
      } else {
        const validated = enforceSafetyInvariants(s.simulatedRaw);
        console.log('🛡 Validated Safe Output:');
        console.log(JSON.stringify(validated, null, 2));
      }
    } else {
      await processUtterance(s.speech, s.simulatedRaw);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ Demo complete! All guardrails enforced cleanly.');
  console.log('='.repeat(60));
}

async function processUtterance(speech, simulatedFallback = null) {
  const normalized = normalizeTranscript(speech);
  console.log(`🧹 Normalized: "${normalized}"`);

  if (hasGroqKey) {
    try {
      const { extractTransaction } = await import('./src/services/extractionService.js');
      const result = await extractTransaction(speech);
      console.log('🤖 AI Extracted (Live Llama 3.3 70B):');
      console.log(JSON.stringify(result, null, 2));
    } catch (err) {
      console.error('❌ Live extraction error:', err.message);
    }
  } else {
    const raw = simulatedFallback || {
      person: speech.includes('Ravi') ? 'Ravi' : null,
      amount: parseInt(speech.match(/\d+/)?.[0] || '0') || null,
      transactionType: speech.includes('kuduth') ? 'PAYMENT' : 'CREDIT',
      confidence: 0.9
    };
    const validated = enforceSafetyInvariants(raw);
    console.log('🛡 Validated Safe Output:');
    console.log(JSON.stringify(validated, null, 2));
  }
}

runDemo().catch(console.error);
