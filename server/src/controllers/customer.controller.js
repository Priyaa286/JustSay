const customerService = require('../services/customer.service');
const { sendSuccess } = require('../utils/response');

const getAllCustomers = async (req, res, next) => {
  try {
    const customers = await customerService.getAllCustomers();
    return sendSuccess(res, 'Customers retrieved successfully', customers);
  } catch (error) {
    next(error);
  }
};

const getCustomerById = async (req, res, next) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    return sendSuccess(res, 'Customer retrieved successfully', customer);
  } catch (error) {
    next(error);
  }
};

const createCustomer = async (req, res, next) => {
  try {
    const customer = await customerService.createCustomer(req.body);
    return sendSuccess(res, 'Customer created successfully', customer, 201);
  } catch (error) {
    next(error);
  }
};

const resolveCustomer = async (req, res, next) => {
  try {
    const { person } = req.query;
    const customer = await customerService.resolveCustomerByName(person);
    return sendSuccess(res, 'Customer resolved successfully', customer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  resolveCustomer
};
