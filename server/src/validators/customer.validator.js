const { z } = require('zod');

const createCustomerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(1, { message: 'Name must not be empty' }),
  nickname: z.string().trim().optional()
}).strict({ message: 'Unexpected or unsafe fields provided' });

const validateCreateCustomer = (req, res, next) => {
  const result = createCustomerSchema.safeParse(req.body);
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
  createCustomerSchema,
  validateCreateCustomer
};
