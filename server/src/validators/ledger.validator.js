const { z } = require('zod');

const prepareTransactionSchema = z.object({
  customerId: z
    .string()
    .min(1, { message: 'customerId must not be empty' })
    .optional(),
  person: z
    .string()
    .min(1, { message: 'person must not be empty' })
    .optional(),
  item: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  amount: z
    .number({ required_error: 'amount is required' })
    .positive({ message: 'amount must be positive (in rupees)' }),
  type: z.enum(['CREDIT', 'PAYMENT'], {
    errorMap: () => ({ message: 'type must be CREDIT or PAYMENT' })
  }),
  transcript: z.string().optional()
}).refine(
  (data) => data.customerId || data.person,
  { message: 'Either customerId or person is required' }
);

const validatePrepareTransaction = (req, res, next) => {
  const result = prepareTransactionSchema.safeParse(req.body);
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
  prepareTransactionSchema,
  validatePrepareTransaction
};
