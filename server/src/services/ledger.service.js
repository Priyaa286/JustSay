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
    throw new Error(`Invalid transaction type: ${type}. Must be CREDIT or PAYMENT.`);
  }

  if (typeof amount !== 'number' || amount <= 0) {
    throw new Error('Amount must be a positive number (in paise).');
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    throw new Error(`Customer with ID ${customerId} not found.`);
  }

  // If created directly as confirmed (rare, but supported cleanly via transaction)
  if (confirmed) {
    return await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          customerId,
          item,
          quantity,
          amount,
          type,
          transcript,
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
      item,
      quantity,
      amount,
      type,
      transcript,
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
      throw new Error(`Transaction with ID ${transactionId} not found.`);
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
      throw new Error(`Customer with ID ${transaction.customerId} not found.`);
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
 * Gets customer details including balance.
 */
const getCustomerBalance = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId }
  });

  if (!customer) {
    throw new Error(`Customer with ID ${customerId} not found.`);
  }

  return {
    customerId: customer.id,
    name: customer.name,
    balancePaise: customer.balance,
    balanceRupees: customer.balance / 100
  };
};

/**
 * Retrieves transactions for a customer.
 */
const getCustomerLedger = async (customerId) => {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!customer) {
    throw new Error(`Customer with ID ${customerId} not found.`);
  }

  return customer;
};

module.exports = {
  TRANSACTION_TYPES,
  createTransaction,
  confirmTransaction,
  getCustomerBalance,
  getCustomerLedger
};
