import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { TransactionSchema } from '../src/schemas/transactionSchema.js';
import { RawExtractionSchema, enforceSafetyInvariants } from '../src/schemas/extractionSchema.js';
import { normalizeTranscript, normalizeTamilNumbers } from '../src/utils/normalizeTranscript.js';
import { buildExtractionMessages } from '../src/prompts/extractionPrompt.js';
import { buildCorrectionMessages } from '../src/prompts/correctionPrompt.js';
import { extractTransaction, correctTransaction } from '../src/services/extractionService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('Zod Schema - Valid Credit Transaction', () => {
  const validData = {
    person: 'Ravi',
    nickname: null,
    item: 'milk packet',
    quantity: 1,
    amount: 50,
    transactionType: 'CREDIT',
    reference: null,
    confidence: 0.95,
    needsClarification: false,
    clarificationReason: null
  };

  const parsed = TransactionSchema.parse(validData);
  assert.equal(parsed.person, 'Ravi');
  assert.equal(parsed.amount, 50);
  assert.equal(parsed.transactionType, 'CREDIT');
  assert.equal(parsed.needsClarification, false);
});

test('Zod Schema - Valid Payment Transaction', () => {
  const validData = {
    person: 'Suresh',
    nickname: null,
    item: null,
    quantity: null,
    amount: 500,
    transactionType: 'PAYMENT',
    reference: null,
    confidence: 0.98,
    needsClarification: false,
    clarificationReason: null
  };

  const parsed = TransactionSchema.parse(validData);
  assert.equal(parsed.person, 'Suresh');
  assert.equal(parsed.amount, 500);
  assert.equal(parsed.transactionType, 'PAYMENT');
});

test('Safety Invariants - Missing Amount must flag needsClarification = true', () => {
  const data = {
    person: 'Ravi',
    amount: null,
    transactionType: 'CREDIT',
    confidence: 0.9
  };

  const validated = enforceSafetyInvariants(data);
  assert.equal(validated.needsClarification, true);
  assert.match(validated.clarificationReason, /Amount is missing or ambiguous/);
});

test('Safety Invariants - Missing Person must flag needsClarification = true', () => {
  const data = {
    person: null,
    amount: 100,
    transactionType: 'CREDIT',
    confidence: 0.9
  };

  const validated = enforceSafetyInvariants(data);
  assert.equal(validated.needsClarification, true);
  assert.match(validated.clarificationReason, /Customer identity\/person is missing/);
});

test('Safety Invariants - Unclear Transaction Type must flag needsClarification = true', () => {
  const data = {
    person: 'Ravi',
    amount: 50,
    transactionType: null,
    confidence: 0.9
  };

  const validated = enforceSafetyInvariants(data);
  assert.equal(validated.needsClarification, true);
  assert.match(validated.clarificationReason, /Transaction type.*is unclear/);
});

test('Safety Invariants - Relative Reference requires clarification without context', () => {
  const data = {
    person: null,
    amount: null,
    transactionType: null,
    reference: {
      type: 'PREVIOUS_TRANSACTION',
      value: 'same as last time'
    },
    confidence: 0.88
  };

  const validated = enforceSafetyInvariants(data);
  assert.equal(validated.needsClarification, true);
  assert.ok(validated.reference);
  assert.equal(validated.reference.value, 'same as last time');
});

test('Transcript Normalizer - Cleans whitespace and normalizes currency & suffixes', () => {
  const raw = '   Ravi-ku   50  rooba   add   pannu   ';
  const cleaned = normalizeTranscript(raw);
  assert.equal(cleaned, 'Ravi ku 50 rupees add pannu');

  const accountRef = 'avanoda    account-la  podu';
  assert.equal(normalizeTranscript(accountRef), 'avanoda account la podu');
});

test('Transcript Normalizer - Spoken Tamil numbers conversion', () => {
  const raw = 'rendu tea kuduthen';
  const converted = normalizeTamilNumbers(raw);
  assert.equal(converted, '2 tea kuduthen');
});

test('Prompt Builders - Format valid chat messages array', () => {
  const messages = buildExtractionMessages('Ravi ku 50 add pannu', { storeId: 'KIRANA_01' });
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'system');
  assert.equal(messages[1].role, 'user');
  assert.ok(messages[1].content.includes('KIRANA_01'));

  const correctionMessages = buildCorrectionMessages({ person: 'Ravi', amount: 500 }, 'No, 50');
  assert.equal(correctionMessages.length, 2);
  assert.ok(correctionMessages[1].content.includes('Current Draft:'));
  assert.ok(correctionMessages[1].content.includes('No, 50'));
});

test('Evaluation Dataset - Validates structure of all 20 test cases in transactions.json', () => {
  const datasetPath = path.resolve(__dirname, '../test-data/transactions.json');
  assert.ok(fs.existsSync(datasetPath), 'transactions.json must exist');

  const content = JSON.parse(fs.readFileSync(datasetPath, 'utf-8'));
  assert.equal(content.length >= 20, true, 'Dataset must have at least 20 evaluation test cases');

  for (const tc of content) {
    assert.ok(tc.id, `Test case must have id: ${tc.description}`);
    assert.ok(tc.input, `Test case ${tc.id} must have input utterance`);
    assert.ok(tc.category, `Test case ${tc.id} must have category`);
    assert.ok(tc.expected, `Test case ${tc.id} must have expected object`);
    assert.equal(typeof tc.expected.needsClarification, 'boolean');
  }
});
