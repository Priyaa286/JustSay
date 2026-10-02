const prisma = require('../config/prisma');

const TRANSACTION_TYPES = {
  CREDIT: 'CREDIT',
  PAYMENT: 'PAYMENT'
};

/**
 * Creates a transaction in unconfirmed state (does not affect balance).
 */
const createTransaction = async ({ customerId, item, quantity, amount, type, transcript, confirmed = false }) => {
  if (!Object.values(TRANSACTION_TYPES).includes(type)) {
    const err = new Error(`Invalid transaction type: ${type}. Must be CREDIT or PAYMENT.`);
    err.statusCode = 400;
    throw err;
  }

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) {
    const err = new Error('Amount must be a positive integer in paise (e.g. ₹50 = 5000).');
    err.statusCode = 400;
    throw err;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    const err = new Error(`Customer with ID ${customerId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  const formattedQuantity = quantity !== undefined && quantity !== null ? String(quantity) : null;

  // If created directly as confirmed (rare, but supported cleanly via transaction)
  if (confirmed) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          customerId,
          item: item || null,
          quantity: formattedQuantity,
          amount,
          type,
          transcript: transcript || null,
          confirmed: true
        }
      });

      const balanceChange = type === TRANSACTION_TYPES.CREDIT ? amount : -amount;

      await tx.customer.update({
        where: { id: customerId },
        data: {
          balance: { increment: balanceChange }
        }
      });

      return transaction;
    });
  }

  return await prisma.transaction.create({
    data: {
      customerId,
      item: item || null,
      quantity: formattedQuantity,
      amount,
      type,
      transcript: transcript || null,
      confirmed: false
    }
  });
};

/**
 * Confirms an existing unconfirmed transaction and updates customer balance atomically.
 * Prevents double-confirmation idempotently.
 */
const confirmTransaction = async (transactionId) => {
  return await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      const err = new Error(`Transaction with ID ${transactionId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    // Idempotency check: if already confirmed, do nothing and return existing state
    if (transaction.confirmed) {
      return {
        alreadyConfirmed: true,
        transaction
      };
    }

    const customer = await tx.customer.findUnique({
      where: { id: transaction.customerId }
    });

    if (!customer) {
      const err = new Error(`Customer with ID ${transaction.customerId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    // Mark as confirmed
    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: { confirmed: true }
    });

    // Update customer balance: CREDIT increases balance (customer owes more), PAYMENT decreases balance
    const balanceChange = transaction.type === TRANSACTION_TYPES.CREDIT
      ? transaction.amount
      : -transaction.amount;

    const updatedCustomer = await tx.customer.update({
      where: { id: transaction.customerId },
      data: {
        balance: { increment: balanceChange }
      }
    });

    return {
      alreadyConfirmed: false,
      transaction: updatedTransaction,
      customer: updatedCustomer
    };
  });
};

/**
 * Cancels an unconfirmed transaction by removing it.
 * Only unconfirmed transactions can be cancelled.
 */
const cancelTransaction = async (transactionId) => {
  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId }
  });

  if (!transaction) {
    const err = new Error(`Transaction with ID ${transactionId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  if (transaction.confirmed) {
    const err = new Error('Cannot cancel a confirmed transaction. Only unconfirmed transactions can be cancelled.');
    err.statusCode = 400;
    throw err;
  }

  await prisma.transaction.delete({
    where: { id: transactionId }
  });

  return {
    cancelled: true,
    message: `Unconfirmed transaction ${transactionId} successfully cancelled.`
  };
};

/**
 * Gets customer details including balance and confirmed transactions.
 */
const getCustomerBalance = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    const err = new Error(`Customer with ID ${customerId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  return {
    customerId: customer.id,
    name: customer.name,
    balancePaise: customer.balance,
    balanceRupees: customer.balance / 100
  };
};

/**
 * Retrieves confirmed ledger transactions across all customers.
 */
const getAllConfirmedTransactions = async () => {
  return await prisma.transaction.findMany({
    where: { confirmed: true },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          nickname: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
};

/**
 * Retrieves a customer's information, current balance, and confirmed transactions.
 */
const getCustomerLedger = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      transactions: {
        where: { confirmed: true },
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!customer) {
    const err = new Error(`Customer with ID ${customerId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      nickname: customer.nickname,
      balancePaise: customer.balance,
      balanceRupees: customer.balance / 100,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt
    },
    transactions: customer.transactions
  };
};

module.exports = {
  TRANSACTION_TYPES,
  createTransaction,
  confirmTransaction,
  cancelTransaction,
  getCustomerBalance,
  getAllConfirmedTransactions,
  getCustomerLedger
};
