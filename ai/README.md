# JustSay — AI/NLP Pipeline Module

**Owner:** Sweety (AI Engineer)  
**Target:** Voice-first AI ledger for Indian street vendors & kirana shopkeepers  

---

## Architecture Overview

```
Voice Audio (Vendor)
        ↓
Whisper Large-v3 (via Groq API)
        ↓
Transcript (Tamil / Tanglish / English)
        ↓
normalizeTranscript.js
        ↓
Llama 3.3 70B (via Groq API)
        ↓
Zod Schema Validation & Invariant Enforcement
        ↓
Structured Transaction JSON (to Priyadharshini's Backend)
```

---

## Architectural Isolation & Safety Rules

1. **Database Decoupling:** This AI module **never** connects to SQLite, never uses Prisma, and never directly writes transactions.
2. **Zero Hallucination Policy:** If speech lacks an amount, person, or transaction type, `needsClarification` is set to `true`.
3. **Relative References:** Utterances like *"same as last time"* or *"avanoda account la podu"* are preserved in the `reference` object and flagged for clarification unless backend context explicitly resolves them.
4. **Correction Handling:** Vendor voice corrections (e.g., *"No 500 illa, 50"*) update the draft state while requiring re-confirmation before final commit.

---

## File Structure

```
ai/
├── src/
│   ├── index.js                  # Public exports
│   ├── services/
│   │   ├── groqService.js        # Groq client & model constants
│   │   ├── transcriptionService.js # Whisper Large-v3 audio transcription
│   │   └── extractionService.js  # Llama 3.3 70B extraction & corrections
│   ├── prompts/
│   │   ├── extractionPrompt.js   # Few-shot Tanglish/Tamil system prompt
│   │   └── correctionPrompt.js   # Conversational correction prompt
│   ├── schemas/
│   │   ├── transactionSchema.js  # Output contract Zod schema
│   │   └── extractionSchema.js   # Safety invariant validation
│   └── utils/
│       └── normalizeTranscript.js# Tamil/Tanglish normalization utilities
├── tests/
│   ├── extraction.test.js        # Unit and invariant tests
│   └── transcription.test.js     # Audio handling & prompt tests
├── test-data/
│   └── transactions.json         # 20 benchmark test cases
├── .env.example                  # Environment template
├── .env                          # Local environment config
├── package.json                  # Dependencies & scripts
└── README.md                     # Documentation
```

---

## Installation & Setup

1. Install dependencies:
   ```bash
   cd ai
   npm install
   ```

2. Configure environment variables in `.env`:
   ```env
   GROQ_API_KEY=your_groq_api_key_here
   GROQ_WHISPER_MODEL=whisper-large-v3
   GROQ_LLAMA_MODEL=llama-3.3-70b-versatile
   ```

3. Run test suite:
   ```bash
   npm test
   ```

---

## Backend Usage Example (For Priyadharshini)

```javascript
import { transcribeAudio, extractTransaction, correctTransaction } from './ai/src/index.js';

// 1. Transcribe voice audio
const { normalizedTranscript } = await transcribeAudio('/path/to/vendor_audio.webm');

// 2. Extract structured transaction
const transaction = await extractTransaction(normalizedTranscript);

if (transaction.needsClarification) {
  // Trigger voice clarification request to vendor
  return respondVendorClarification(transaction.clarificationReason);
}

// 3. Ask vendor voice confirmation: "Ravi-ku 50 rupees credit-aa?"
// If vendor corrects: "No, 50"
const corrected = await correctTransaction(transaction, "No, 50");

// 4. Once confirmed, backend writes to Prisma/SQLite:
// await prisma.transaction.create({ data: corrected });
```
