const { z } = require('zod');

const extractionResultSchema = z.object({
  person: z.string().trim().nullable(),
  nickname: z.string().trim().nullable(),
  item: z.string().trim().nullable(),
  quantity: z.number().nullable(),
  amount: z.number().nullable(), // amount in Rupees
  transactionType: z.enum(['CREDIT', 'PAYMENT']).nullable(),
  reference: z.string().trim().nullable(),
  confidence: z.number().min(0).max(1),
  needsClarification: z.boolean()
}).strict();

const extractRequestSchema = z.object({
  transcript: z
    .string({ required_error: 'transcript is required' })
    .trim()
    .min(1, { message: 'transcript must not be empty' })
}).strict({ message: 'Unexpected fields provided in request' });

const validateExtractRequest = (req, res, next) => {
  const result = extractRequestSchema.safeParse(req.body);
  if (!result.success) {
    const errorMessages = result.error.issues.map((issue) => issue.message).join(', ');
    const err = new Error(`Validation Error: ${errorMessages}`);
    err.statusCode = 400;
    return next(err);
  }
  req.body = result.data;
  next();
};

module.exports = {
  extractionResultSchema,
  extractRequestSchema,
  validateExtractRequest
};
