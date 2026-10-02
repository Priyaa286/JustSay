# JustSay — Voice-First AI Ledger for Street Vendors & Kirana Shopkeepers

JustSay is a voice-first AI ledger designed to enable Indian kirana shopkeepers and street vendors to record credit and payment transactions naturally through voice in Tamil, Tanglish, and English code-switched speech.

---

## Team Responsibilities

- **Sweety (AI Engineer):** Speech-to-Text (Whisper Large-v3), Tamil/Tanglish NLP, Llama 3.3 70B extraction, structured Zod schemas, zero-hallucination guardrails, and evaluation datasets. (Isolated in `ai/`).
- **Priyadharshini (Backend Engineer):** Express backend, SQLite, Prisma, customer balances, ledger database logic. (In `server/`).
- **Naga Varshini (Frontend Engineer):** Client application, mobile UI, audio recording, confirmation UI. (In `client/`).

---

## Directory Structure

```
JustSay/
├── ai/        # AI & NLP Pipeline (Groq Whisper, Llama 3.3 70B, Zod)
├── client/    # Naga's frontend UI
├── server/    # Priyadharshini's backend ledger
├── .gitignore
└── README.md
```

---

## AI Module Getting Started

```bash
cd ai
npm install
npm test
```
