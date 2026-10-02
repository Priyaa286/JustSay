import { z } from 'zod';
import { TransactionSchema } from './transactionSchema.js';

/**
 * Raw Extraction Schema from LLM output.
 * Allows slightly more lenient parsing from the LLM before applying safety invariants.
 */
export const RawExtractionSchema = z.object({
  person: z.union([z.string(), z.null()]).transform(val => (val && val.trim().length > 0 ? val.trim() : null)),
  nickname: z.union([z.string(), z.null()]).default(null).transform(val => (val && val.trim().length > 0 ? val.trim() : null)),
  item: z.union([z.string(), z.null()]).default(null).transform(val => (val && val.trim().length > 0 ? val.trim() : null)),
  quantity: z.union([z.number(), z.string(), z.null()]).default(null).transform(val => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) || num <= 0 ? null : num;
  }),
  amount: z.union([z.number(), z.string(), z.null()]).transform(val => {
    if (val === null || val === undefined) return null;
    const num = Number(val);
    return isNaN(num) || num <= 0 ? null : num;
  }),
  transactionType: z.enum(['CREDIT', 'PAYMENT']).nullable().catch(null),
  reference: z.object({
    type: z.enum(['PREVIOUS_TRANSACTION', 'ACCOUNT_SIDE', 'THIRD_PARTY', 'UNKNOWN']).catch('UNKNOWN'),
    value: z.string()
  }).nullable().default(null),
  confidence: z.number().min(0).max(1).default(0.9),
  needsClarification: z.boolean().default(false),
  clarificationReason: z.string().nullable().default(null)
});

/**
 * Invariant safety validator:
 * Enforces the core safety rule:
 * "Never hallucinate missing information.
 * If the speech does not clearly contain an amount: needsClarification = true
 * If the person is ambiguous: needsClarification = true
 * If transaction type is ambiguous: needsClarification = true"
 *
 * @param {object} parsedData
 * @returns {object} Validated and safety-checked transaction object
 */
export function enforceSafetyInvariants(parsedData) {
  const result = {
    person: null,
    nickname: null,
    item: null,
    quantity: null,
    amount: null,
    transactionType: null,
    reference: null,
    confidence: 0.9,
    needsClarification: false,
    clarificationReason: null,
    ...parsedData
  };
  result.needsClarification = Boolean(result.needsClarification);
  const reasons = [];

  // Invariant 1: Missing or invalid amount
  if (result.amount === null || result.amount === undefined || result.amount <= 0) {
    result.needsClarification = true;
    reasons.push('Amount is missing or ambiguous.');
  }

  // Invariant 2: Missing or ambiguous person (unless explicit relative reference is captured)
  if (!result.person && !result.reference) {
    result.needsClarification = true;
    reasons.push('Customer identity/person is missing or ambiguous.');
  }

  // Invariant 3: Missing or ambiguous transaction type
  if (!result.transactionType) {
    result.needsClarification = true;
    reasons.push('Transaction type (CREDIT or PAYMENT) is unclear.');
  }

  // Invariant 4: Relative references must require clarification unless resolved by context
  if (result.reference && !result.person) {
    result.needsClarification = true;
    reasons.push(`Contains unresolved relative reference: "${result.reference.value}".`);
  }

  // Invariant 5: Low confidence triggers clarification
  if (result.confidence < 0.8) {
    result.needsClarification = true;
    reasons.push(`Confidence (${result.confidence}) is below threshold.`);
  }

  if (reasons.length > 0) {
    result.clarificationReason = result.clarificationReason
      ? `${result.clarificationReason} | ${reasons.join(' ')}`
      : reasons.join(' ');
  }

  return TransactionSchema.parse(result);
}

export default {
  RawExtractionSchema,
  enforceSafetyInvariants
};
