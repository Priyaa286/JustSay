const ledgerService = require('../services/ledger.service');
const customerService = require('../services/customer.service');
const { sendSuccess } = require('../utils/response');

const prepareTransaction = async (req, res, next) => {
  try {
    // If person is provided instead of customerId, resolve it
    if (!req.body.customerId && req.body.person) {
      const customer = await customerService.resolveCustomerByName(req.body.person);
      req.body.customerId = customer.id;
    }
    const transaction = await ledgerService.createTransaction(req.body);
    return sendSuccess(res, 'Transaction prepared successfully', transaction, 201);
  } catch (error) {
    next(error);
  }
};

const confirmTransaction = async (req, res, next) => {
  try {
    const result = await ledgerService.confirmTransaction(req.params.transactionId);
    
    if (result.alreadyConfirmed) {
      return sendSuccess(res, 'Transaction has already been confirmed', result.transaction, 200);
    }

    return sendSuccess(res, 'Transaction confirmed successfully', result, 200);
  } catch (error) {
    next(error);
  }
};

const cancelTransaction = async (req, res, next) => {
  try {
    const result = await ledgerService.cancelTransaction(req.params.transactionId);
    return sendSuccess(res, result.message, null, 200);
  } catch (error) {
    next(error);
  }
};

const getAllConfirmedLedger = async (req, res, next) => {
  try {
    const transactions = await ledgerService.getAllConfirmedTransactions();
    return sendSuccess(res, 'Confirmed ledger transactions retrieved successfully', transactions);
  } catch (error) {
    next(error);
  }
};

const getCustomerLedger = async (req, res, next) => {
  try {
    const ledger = await ledgerService.getCustomerLedger(req.params.customerId);
    return sendSuccess(res, 'Customer ledger retrieved successfully', ledger);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  prepareTransaction,
  confirmTransaction,
  cancelTransaction,
  getAllConfirmedLedger,
  getCustomerLedger
};
