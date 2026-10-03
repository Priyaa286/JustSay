# JustSay

### A Voice-First Digital Ledger for Small Businesses

[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react\&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Build-Vite-646CFF?logo=vite\&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js-339933?logo=node.js\&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/API-Express-000000?logo=express\&logoColor=white)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite-003B57?logo=sqlite\&logoColor=white)](https://www.sqlite.org/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma\&logoColor=white)](https://www.prisma.io/)
[![Groq](https://img.shields.io/badge/AI-Groq-orange)](https://groq.com/)
[![GitHub](https://img.shields.io/badge/Code-GitHub-181717?logo=github\&logoColor=white)](https://github.com/)

---

## Project Overview

**JustSay** is a voice-first digital ledger designed for street vendors, small shopkeepers, and local businesses who regularly manage credit and payment transactions.

Instead of stopping to type every transaction, users can simply **speak naturally in Tamil or Tanglish**. JustSay processes the voice input, understands the transaction, extracts the relevant information, and updates the customer's ledger.

### Core Interaction

**Speak → Understand → Record**

For example:

> "Ravi bought vegetables for 200 on credit."

JustSay can identify:

```json
{
  "customer": "Ravi",
  "amount": 200,
  "type": "credit",
  "description": "Vegetables"
}
```

The structured transaction is then validated and stored in the customer's ledger.

---

## Why We Created JustSay

Many street vendors and small shopkeepers still manage customer credit and payment records using:

* Memory
* Paper notebooks
* Manual calculations
* Informal verbal records

This can make it difficult to maintain accurate records when there are many customers and frequent transactions.

Traditional digital ledger applications can also require typing and multiple interactions, which may be inconvenient for a vendor who is serving customers at the same time.

**JustSay addresses this by making voice the primary interaction method.**

A vendor can speak a transaction naturally while continuing their work, allowing the system to convert the spoken information into a structured digital record.

The project focuses on making AI-powered digital bookkeeping more accessible through **regional-language voice interaction**, particularly for Tamil-speaking small businesses.

---

## Key Features

### Voice-Based Transaction Entry

Users can record transactions through natural voice input instead of typing.

### Tamil and Tanglish Support

The AI pipeline is designed to handle Tamil and Tanglish-style conversational input.

### AI-Powered Speech Recognition

Voice input is converted into text using **Whisper Large-v3** through Groq.

### Intelligent Transaction Extraction

The language model extracts important transaction fields such as:

* Customer name
* Amount
* Transaction type
* Description
* Relevant transaction details

### Automatic Credit and Payment Classification

The system identifies whether the transaction represents a **Credit** or **Payment**.

### Customer-Wise Ledgers

Each customer has an individual ledger containing their transaction history and current balance.

### Transaction History

Users can review previous transactions associated with each customer.

### Draft Review and Correction

Before final confirmation, extracted transactions can be reviewed and corrected.

### Clarification Handling

If important information is missing or unclear, JustSay can request clarification before recording the transaction.

### Voice and Text Feedback

The application provides understandable feedback after processing a transaction.

---

# System Architecture

```text
                    User
                      |
                      v
             React + Vite Client
                  (client/)
                      |
                      | REST API
                      v
             Node.js + Express
                  (server/)
                      |
          +-----------+-----------+
          |                       |
          v                       v
    AI Pipeline              Prisma ORM
       (ai/)                     |
          |                      v
     +----+----+              SQLite
     |         |
     v         v
 Whisper    Llama 3.3
Large-v3       70B
     |         |
     +----+----+
          |
          v
 Structured Transaction
          |
          v
     Zod Validation
          |
          v
     Customer Ledger
```

---

# AI Pipeline

JustSay separates the AI processing pipeline from the main backend.

### 1. Speech-to-Text

The user's voice input is processed using:

**Whisper Large-v3**

The model converts spoken Tamil/Tanglish input into text.

### 2. Language Understanding

The transcript is passed to:

**Llama 3.3 70B**

The model interprets the user's intent and extracts the transaction details.

### 3. Structured Extraction

The unstructured conversational input is converted into structured transaction data.

Example:

```json
{
  "customer": "Ravi",
  "amount": 200,
  "type": "credit",
  "description": "Vegetables"
}
```

### 4. Schema Validation

The extracted data is validated using **Zod** before it is passed to the backend.

This helps ensure that the transaction follows the expected structure.

### 5. Database Storage

After validation and confirmation, the transaction is stored using **Prisma ORM** with a **SQLite** database.

---

# Technologies Used

| Layer                  | Technology       |
| ---------------------- | ---------------- |
| Frontend               | React            |
| Build Tool             | Vite             |
| Styling                | CSS              |
| Backend                | Node.js          |
| API Framework          | Express.js       |
| AI Pipeline            | Node.js          |
| Speech Recognition     | Whisper Large-v3 |
| Language Model         | Llama 3.3 70B    |
| AI Inference           | Groq API         |
| Validation             | Zod              |
| ORM                    | Prisma           |
| Database               | SQLite           |
| API Communication      | REST API         |
| Version Control        | Git + GitHub     |
| Frontend Deployment    | Vercel           |
| Application Deployment | Render           |

---

# Project Structure

```text
JustSay/
│
├── ai/                              # AI Pipeline
│   ├── src/
│   │   ├── index.js                 # AI engine entry point
│   │   ├── services/                # Groq Whisper and LLM services
│   │   ├── prompts/                 # Tamil and Tanglish prompts
│   │   ├── schemas/                 # Zod transaction schemas
│   │   └── utils/                   # Audio preprocessing and normalization
│   ├── tests/                       # AI pipeline tests
│   └── package.json                 # AI dependencies
│
├── client/                          # React + Vite Frontend
│   ├── src/
│   │   ├── App.jsx                  # Main application view
│   │   ├── index.css                # Terracotta and cream design system
│   │   ├── main.jsx                 # React entry point
│   │   ├── components/
│   │   │   ├── Header.jsx
│   │   │   ├── VoiceRecorder.jsx
│   │   │   ├── PendingTransactionCard.jsx
│   │   │   ├── ClarifyCard.jsx
│   │   │   ├── CorrectionModal.jsx
│   │   │   ├── NewCustomerCard.jsx
│   │   │   ├── CustomerList.jsx
│   │   │   └── CustomerLedger.jsx
│   │   └── services/
│   │       └── api.js               # Backend API client
│   ├── vercel.json                  # SPA routing configuration
│   └── package.json                 # Frontend dependencies
│
├── server/                          # Node.js + Express Backend
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema
│   │   ├── seed.js                  # Database seeding
│   │   └── dev.db                   # SQLite database
│   ├── src/
│   │   ├── server.js                # Server entry point
│   │   ├── app.js                   # Express configuration
│   │   ├── config/                  # Environment configuration
│   │   ├── controllers/             # API handlers
│   │   ├── routes/                  # API routes
│   │   ├── services/                # Business logic
│   │   ├── middleware/              # Upload and error middleware
│   │   ├── utils/                   # API response utilities
│   │   └── validators/               # Input validation
│   └── package.json                 # Backend dependencies
│
└── README.md                        # Project documentation
```

---

# Application Workflow

```text
User speaks
     |
     v
Voice Recorder
     |
     v
Audio sent to Backend
     |
     v
Whisper Large-v3
     |
     v
Tamil/Tanglish Transcript
     |
     v
Llama 3.3 70B
     |
     v
Transaction Extraction
     |
     v
Zod Validation
     |
     v
Draft Transaction
     |
     +-----> Correction / Clarification
     |
     v
User Confirmation
     |
     v
Prisma ORM
     |
     v
SQLite Database
     |
     v
Customer Ledger Updated
```

---

# Example Workflow

### User Input

```text
"Ravi bought vegetables for 200 on credit."
```

### Speech Recognition

```text
Ravi bought vegetables for 200 on credit.
```

### AI Extraction

```json
{
  "customer": "Ravi",
  "amount": 200,
  "type": "credit",
  "description": "Vegetables"
}
```

### Validation

The extracted transaction is checked against the defined Zod schema.

### Confirmation

The user can review the generated transaction before saving it.

### Storage

The confirmed transaction is stored in the customer's ledger.

---

# Setup and Installation

## Prerequisites

Make sure the following are installed:

* Node.js
* npm
* Git
* A Groq API key

---

## 1. Clone the Repository

```bash
git clone https://github.com/Priyaa286/JustSay.git
cd JustSay
```

---

## 2. Install AI Dependencies

```bash
cd ai
npm install
```

---

## 3. Install Backend Dependencies

Open another terminal:

```bash
cd server
npm install
```

---

## 4. Install Frontend Dependencies

Open another terminal:

```bash
cd client
npm install
```

---

# Environment Variables

Create a `.env` file inside the `server/` directory if required by the backend configuration.

Example:

```env
GROQ_API_KEY=your_groq_api_key
PORT=5000
```

Do not commit API keys or other secrets to GitHub.

---

# Database Setup

The backend uses **Prisma ORM with SQLite**.

From the `server/` directory:

```bash
npx prisma generate
```

If database migrations are required:

```bash
npx prisma migrate dev
```

To seed initial data:

```bash
node prisma/seed.js
```

---

# Running the Project

The project consists of three main parts:

* AI pipeline
* Backend server
* Frontend client

## Start the Backend

```bash
cd server
npm run dev
```

The backend will run on the configured server port.

---

## Start the Frontend

In another terminal:

```bash
cd client
npm run dev
```

Vite will provide a local development URL.

Open the displayed URL in your browser.

---

## AI Pipeline

The AI pipeline is integrated with the backend through the project's AI services.

The main entry point is:

```text
ai/src/index.js
```

It exposes the core AI functionality used for speech transcription and transaction extraction.

---

# API Structure

The backend provides REST endpoints for the application's core functionality.

```text
/api/voice
/api/customers
/api/ledger
```

### Voice API

Handles voice transaction processing and communication with the AI pipeline.

### Customers API

Handles customer creation and customer information.

### Ledger API

Handles transaction records and customer ledger information.

---

# Design

JustSay uses a **terracotta and cream** visual design system inspired by the project's focus on accessibility, simplicity, and local business environments.

The interface is designed around a simple interaction model:

```text
Speak
  ↓
Review
  ↓
Confirm
  ↓
Ledger Updated
```

The goal is to minimize typing and unnecessary navigation.

---

# Deployment

The project supports separate deployment of the frontend and backend.

### Frontend

The React + Vite client can be deployed using Vercel.

### Backend

The Node.js + Express application can be deployed using Render.

### Current Project

**Live Application:**

https://justsay-ledger.onrender.com

**GitHub Repository:**

https://github.com/Priyaa286/JustSay/tree/main

**Demo Video:**

https://drive.google.com/file/d/1sv4qNjTjuANfdoBKQ9h1FjF-kNTPkCJX/view?usp=sharing

---

# Evaluation Approach

JustSay evaluates the AI pipeline based on its ability to convert natural voice input into structured transaction information.

The key fields include:

| Field       | Purpose                          |
| ----------- | -------------------------------- |
| Customer    | Identifies the customer          |
| Amount      | Extracts the transaction amount  |
| Type        | Identifies Credit or Payment     |
| Description | Captures the transaction context |

The structured output is validated using Zod before being used by the application.

The system is designed to handle natural Tamil and Tanglish-style transaction descriptions rather than requiring users to follow a fixed command format.

---

# Future Scope

Potential extensions include:

* Support for additional Indian languages
* Mobile and Progressive Web App support
* Automated payment reminders
* Business analytics and dashboards
* Daily and monthly financial reports
* Improved multilingual voice feedback
* Digital payment integration
* Cloud synchronization
* Multi-user business accounts
* Offline-first transaction recording
* Personalized business insights

---

# Hackathon

**Build Fast with AI: AI Build Challenge 2026**

**Problem Statement:** PS-06 — AI for Bharat in Indian Languages

**Project:** JustSay

**Team:** Creative Compilers

---

# Vision

> **No typing. No complicated bookkeeping. Just speak.**

JustSay aims to make everyday financial record-keeping simpler by allowing small businesses to interact with their digital ledger using natural voice.
