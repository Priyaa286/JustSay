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

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer
};
