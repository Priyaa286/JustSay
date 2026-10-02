const getGroqClient = require('../config/groq');
const env = require('../config/env');
const { extractionResultSchema } = require('../validators/extraction.validator');

const EXTRACTION_SYSTEM_PROMPT = `You are the structured extraction engine for JustSay, a voice-first credit ledger for Indian street vendors and small shopkeepers.

Your task is to analyze Tamil / Tanglish / English spoken transcripts of street vendor transaction records and extract structured data into JSON format.

RULES & CONVENTIONS:
1. Extract ONLY facts explicitly present in the transcript. Never invent names, amounts, products, quantities, or transaction types.
2. LEDGER DIRECTION CONVENTION:
   - "CREDIT": Customer receives goods/items or adds credit/balance (customer owes vendor money). Examples: "Ravi ku 50 rupees add pannu", "Ravi 50 rupees paal packet eduthutaan", "Suresh ku 2 biscuit packet 40 rupees".
   - "PAYMENT": Customer pays cash or clears debt (customer pays vendor money). Examples: "Mani 100 rupees kuduthutaan", "Lakshmi akka 200 cash thandhaanga", "Ravi paid 50 rupees".
   - If direction is ambiguous or unclear, set "transactionType": null and "needsClarification": true.
3. AMOUNT RULE:
   - "amount": Explicit monetary amount in Indian Rupees (₹) as a number (e.g., 50 for ₹50). Do NOT convert to paise.
   - If amount is missing or ambiguous, set "amount": null and "needsClarification": true.
4. PERSON & NICKNAME:
   - "person": Spoken name of the customer/person (e.g. "Ravi", "Mani", "Suresh", "Lakshmi").
   - "nickname": Honorific/nickname if explicitly mentioned (e.g. "anna", "akka"), otherwise null.
   - If person is missing, set "person": null and "needsClarification": true.
5. ITEM & QUANTITY:
   - "item": Product/item explicitly mentioned (e.g. "paal packet", "biscuit packet").
   - "quantity": Numeric quantity if explicitly mentioned (e.g. 2 for "rendu / 2"), otherwise null.
6. CONFIDENCE & CLARIFICATION:
   - "confidence": A float between 0.0 and 1.0 indicating confidence.
   - "needsClarification": Set to true whenever essential details (person, amount, or transactionType) are missing, ambiguous, contradictory, or uncertain. Otherwise false.

OUTPUT FORMAT:
Return ONLY a valid, raw JSON object matching this structure:
{
  "person": string | null,
  "nickname": string | null,
  "item": string | null,
  "quantity": number | null,
  "amount": number | null,
  "transactionType": "CREDIT" | "PAYMENT" | null,
  "reference": string | null,
  "confidence": number,
  "needsClarification": boolean
}`;

/**
 * Extracts structured transaction data from a spoken transcript.
 */
const extractFromTranscript = async (transcript) => {
  if (env.MOCK_TRANSCRIPTION) {
    // Deterministic mock logic for testing
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
        needsClarification: false
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
        needsClarification: false
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
        needsClarification: false
      };
    }
    if (transcript.includes('Ravi ku 50 rupees')) {
      return {
        person: 'Ravi',
        nickname: null,
        item: null,
        quantity: null,
        amount: 50,
        transactionType: null,
        reference: null,
        confidence: 0.6,
        needsClarification: true
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
        needsClarification: true
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
      needsClarification: true
    };
  }

  if (!env.GROQ_API_KEY) {
    const error = new Error('Groq API Key is not configured on the server. Please set GROQ_API_KEY in .env or enable MOCK_TRANSCRIPTION=true.');
    error.statusCode = 500;
    throw error;
  }

  const groq = getGroqClient();

  try {
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: transcript }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    });

    const rawContent = response.choices?.[0]?.message?.content;

    if (!rawContent) {
      const err = new Error('Groq LLM returned an empty response.');
      err.statusCode = 502;
      throw err;
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error('❌ Groq JSON Parse Error:', parseErr.message, rawContent);
      const err = new Error('LLM returned malformed non-JSON output.');
      err.statusCode = 502;
      throw err;
    }

    // Validate structure against strict Zod schema
    const validationResult = extractionResultSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      console.error('❌ LLM Output Zod Validation Failure:', validationResult.error.issues);
      const err = new Error('Structured extraction failed Zod validation rules.');
      err.statusCode = 502;
      throw err;
    }

    return validationResult.data;
  } catch (error) {
    if (error.statusCode) throw error;
    console.error('❌ Groq Extraction API Error:', error.message);
    const err = new Error(error.message || 'Groq Llama extraction failed.');
    err.statusCode = error.status || 500;
    throw err;
  }
};

module.exports = {
  extractFromTranscript
};
