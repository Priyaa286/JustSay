const { z } = require('zod');

const prepareTransactionSchema = z.object({
  customerId: z
    .string({ required_error: 'customerId is required' })
    .min(1, { message: 'customerId must not be empty' }),
  item: z.string().optional(),
  quantity: z.union([z.string(), z.number()]).optional(),
  amount: z
    .number({ required_error: 'amount is required' })
    .int({ message: 'amount must be an integer (in paise)' })
    .positive({ message: 'amount must be positive' }),
  type: z.enum(['CREDIT', 'PAYMENT'], {
    errorMap: () => ({ message: 'type must be CREDIT or PAYMENT' })
  }),
  transcript: z.string().optional()
});

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
