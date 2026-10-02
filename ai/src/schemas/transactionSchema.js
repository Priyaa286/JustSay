import { z } from 'zod';

/**
 * Zod schema defining the reference structure for relative transactions
 * e.g., "same as last time", "avanoda account la podu"
 */
export const ReferenceSchema = z.object({
  type: z.enum([
    'PREVIOUS_TRANSACTION',
    'ACCOUNT_SIDE',
    'THIRD_PARTY',
    'UNKNOWN'
  ]).describe('Category of the relative reference'),
  value: z.string().describe('The verbatim or normalized reference phrase spoken by the vendor')
}).nullable().default(null);

/**
 * Allowed transaction types in JustSay
 * CREDIT: Goods given on credit / tab added (debt increases)
 * PAYMENT: Money received from customer / debt cleared
 */
export const TransactionTypeSchema = z.enum(['CREDIT', 'PAYMENT']);

/**
 * Master Transaction Schema conforming to JustSay project standards
 */
export const TransactionSchema = z.object({
  person: z.string().nullable().describe('Customer or vendor name extracted from speech'),
  nickname: z.string().nullable().default(null).describe('Informal nickname or alias if mentioned'),
  item: z.string().nullable().default(null).describe('Item or goods mentioned in the transaction (e.g. tea, milk packet)'),
  quantity: z.number().positive().nullable().default(null).describe('Quantity of items if specified'),
  amount: z.number().positive().nullable().describe('Monetary amount in INR (rupees)'),
  transactionType: TransactionTypeSchema.nullable().describe('CREDIT or PAYMENT'),
  reference: ReferenceSchema.default(null),
  confidence: z.number().min(0).max(1).default(0.9).describe('Extraction confidence score between 0.0 and 1.0'),
  needsClarification: z.boolean().default(false).describe('True if information is missing, ambiguous, or needs vendor clarification'),
  clarificationReason: z.string().nullable().default(null).describe('Explanation of why clarification is needed, if any')
});

export default TransactionSchema;
