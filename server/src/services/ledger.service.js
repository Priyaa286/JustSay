const prisma = require('../config/prisma');

const TRANSACTION_TYPES = {
  CREDIT: 'CREDIT',
  PAYMENT: 'PAYMENT'
};

/**
 * Creates a transaction in PENDING state (does not affect balance).
 * Amount is accepted in RUPEES and converted to integer PAISE internally.
 * If confirmed=true is passed, creates as CONFIRMED atomically with balance update.
 */
const createTransaction = async ({ customerId, item, quantity, amount, type, transcript, confirmed = false }) => {
  if (!Object.values(TRANSACTION_TYPES).includes(type)) {
    const err = new Error(`Invalid transaction type: ${type}. Must be CREDIT or PAYMENT.`);
    err.statusCode = 400;
    throw err;
  }

  if (typeof amount !== 'number' || amount <= 0) {
    const err = new Error('Amount must be a positive number (in rupees).');
    err.statusCode = 400;
    throw err;
  }

  // Convert amount from rupees to paise (integer)
  const amountPaise = Math.round(amount * 100);

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
          amount: amountPaise,
          type,
          transcript: transcript || null,
          confirmed: true,
          status: 'CONFIRMED'
        }
      });

      const balanceChange = type === TRANSACTION_TYPES.CREDIT ? amountPaise : -amountPaise;

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
      amount: amountPaise,
      type,
      transcript: transcript || null,
      confirmed: false,
      status: 'PENDING'
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
    if (transaction.status === 'CONFIRMED' || transaction.confirmed) {
      return {
        alreadyConfirmed: true,
        transaction
      };
    }
    
    if (transaction.status === 'CANCELLED') {
      const err = new Error(`Transaction with ID ${transactionId} is cancelled and cannot be confirmed.`);
      err.statusCode = 400;
      throw err;
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
      data: { confirmed: true, status: 'CONFIRMED' }
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
 * Cancels a PENDING transaction by setting its status to CANCELLED.
 * Only PENDING transactions can be cancelled.
 * CONFIRMED → CANCELLED is rejected.
 * CANCELLED → CANCELLED is idempotent (returns success).
 * Uses prisma.$transaction for atomicity to prevent race conditions.
 */
const cancelTransaction = async (transactionId) => {
  return await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction) {
      const err = new Error(`Transaction with ID ${transactionId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    if (transaction.status === 'CONFIRMED' || transaction.confirmed) {
      const err = new Error('Cannot cancel a confirmed transaction. Only PENDING transactions can be cancelled.');
      err.statusCode = 400;
      throw err;
    }

    if (transaction.status === 'CANCELLED') {
      return {
        cancelled: true,
        message: `Transaction ${transactionId} is already cancelled.`
      };
    }

    // Atomically update status to CANCELLED
    await tx.transaction.update({
      where: { id: transactionId },
      data: { status: 'CANCELLED' }
    });

    return {
      cancelled: true,
      message: `PENDING transaction ${transactionId} successfully cancelled.`
    };
  });
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
    where: { status: 'CONFIRMED' },
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
        where: { status: 'CONFIRMED' },
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
