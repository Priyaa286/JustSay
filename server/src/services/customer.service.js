const prisma = require('../config/prisma');

const getAllCustomers = async () => {
  return await prisma.customer.findMany({
    orderBy: { name: 'asc' }
  });
};

const getCustomerById = async (id) => {
  const customer = await prisma.customer.findUnique({
    where: { id }
  });

  if (!customer) {
    const error = new Error(`Customer with ID ${id} not found`);
    error.statusCode = 404;
    throw error;
  }

  return customer;
};

const createCustomer = async (data) => {
  const { name, nickname } = data;

  return await prisma.customer.create({
    data: {
      name,
      nickname: nickname || null,
      balance: 0 // Balance strictly starts at 0
    }
  });
};

/**
 * Resolves a customer by spoken name or nickname.
 * 
 * Performs case-insensitive, whitespace-normalized matching
 * against both the `name` and `nickname` fields.
 * 
 * - Exactly one match → returns the customer.
 * - Zero matches → throws 404 (customer not found).
 * - Multiple matches → throws 409 (ambiguous).
 * 
 * Does NOT create customers. Does NOT use fuzzy matching.
 */
const resolveCustomerByName = async (person) => {
  if (!person || typeof person !== 'string') {
    const err = new Error('person is required for customer resolution');
    err.statusCode = 400;
    throw err;
  }

  // Normalize: trim + collapse internal whitespace + lowercase
  const normalized = person.trim().replace(/\s+/g, ' ').toLowerCase();

  if (normalized.length === 0) {
    const err = new Error('person must not be empty');
    err.statusCode = 400;
    throw err;
  }

  // Fetch all customers and match in JS (SQLite lacks native ILIKE).
  // For a small-vendor dataset this is efficient and correct.
  const allCustomers = await prisma.customer.findMany();

  const matches = allCustomers.filter((c) => {
    const nameNorm = c.name.trim().replace(/\s+/g, ' ').toLowerCase();
    const nicknameNorm = c.nickname
      ? c.nickname.trim().replace(/\s+/g, ' ').toLowerCase()
      : null;

    return nameNorm === normalized || nicknameNorm === normalized;
  });

  if (matches.length === 0) {
    const err = new Error(`No customer found matching "${person}". Please register the customer first.`);
    err.statusCode = 404;
    err.code = 'CUSTOMER_NOT_FOUND';
    throw err;
  }

  if (matches.length > 1) {
    const names = matches.map((m) => `${m.name} (${m.id})`).join(', ');
    const err = new Error(`Multiple customers match "${person}": ${names}. Please specify the exact customer.`);
    err.statusCode = 409;
    err.code = 'CUSTOMER_AMBIGUOUS';
    throw err;
  }

  return matches[0];
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  resolveCustomerByName
};
