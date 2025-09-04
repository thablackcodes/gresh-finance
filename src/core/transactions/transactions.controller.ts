import { ApiError } from "../../middlewares";
import { Asyncly } from "../../extension";
import { prisma } from "../../db";
import { logger } from "../../config";
import {
  generateTransactionReference,
  generateTransferReference,
} from "../../helpers";
import { toMoney, removeNullsDeep } from "./transaction.utils";
import { transactionValidation } from "./transaction.validation";
import { Request, Response } from "express";
import { httpStatus, withPagination } from "../../utils";

const depositToAccount = Asyncly(async (req: Request, res: Response) => {
  const customerId = req.currentUser.id;
  logger.info("depositToAccount: Initiating deposit request.");
  const data = transactionValidation.depositSchema.parse(req.body);
  

  const account = await prisma.account.findUnique({
    where: { accountNumber: data.accountNumber},
  });
  if (!account) {
    logger.warn(`depositToAccount: Account not found for accountNumber: ${data.accountNumber}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Account not found");
  }
  logger.debug(`depositToAccount: Account found. Account ID: ${account.id}, Status: ${account.status}`);
  
  if (account.customerId !== customerId) {
      logger.warn(`depositToAccount: Unauthorized deposit attempt. Customer ${customerId} tried to deposit to account ${account.id} owned by ${account.customerId}`);
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You don't have permission to deposit to this account"
      );
    }

  if (account.status !== "ACTIVE") {
    logger.warn(`depositToAccount: Deposit attempt to non-ACTIVE account. Account ID: ${account.id}, Status: ${account.status}`);
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Cannot deposit to ${account.status} account`,
    );
  }

  const balanceBefore = account.balance;
  logger.info(`depositToAccount: Starting transaction for account ID: ${account.id}. Amount: ${data.amount}, Balance before: ${balanceBefore}`);

  const result = await prisma.$transaction(async (tx) => {
    // Update balance
    const updated = await tx.account.update({
      where: { id: account.id },
      data: { balance: { increment: data.amount } },
    });
    logger.debug(`depositToAccount: Account balance updated. Account ID: ${account.id}, New balance: ${updated.balance}`);

    // Create transaction log
    const transactionTxRef = generateTransactionReference();
    const transaction = await tx.transaction.create({
      data: {
        toAccountId: account.id,
        type: "DEPOSIT",
        category: "CREDIT",
        amount: data.amount,
        balanceAfter: updated.balance,
        status: "SUCCESS",
        narration: data.narration,
        reference: transactionTxRef,
      },
    });
    logger.debug(`depositToAccount: Transaction log created. Transaction ID: ${transaction.id}, Reference: ${transactionTxRef}`);

    return { updated, transaction };
  });

  logger.info(`depositToAccount: Transaction completed successfully for account ID: ${account.id}. New balance: ${result.updated.balance}`);

  // 3. Response
  res.status(httpStatus.OK).json({
    success: true,
    message: "Deposit successful",
    account: {
      accountNumber: account.accountNumber,
      balanceBefore,
      balanceAfter: result.updated.balance,
      currency: account.currency,
    },
    transaction: {
      reference: result.transaction.reference,
      type: result.transaction.type,
      category: result.transaction.category,
      amount: result.transaction.amount,
      status: result.transaction.status,
      narration: result.transaction.narration,
    },
  });
  logger.info(`depositToAccount: Deposit successful response sent for account ID: ${account.id}.`);
});

const withdrawFromAccount = Asyncly(async (req: Request, res: Response) => {
  const customerId = req.currentUser.id;
  logger.info("withdrawFromAccount: Initiating withdrawal request.");
  const data = transactionValidation.withdrawalSchema.parse(req.body);

  const account = await prisma.account.findUnique({
    where: { accountNumber: data.accountNumber},
    include: { customer: true },
  });
  if (!account) {
    logger.warn(`withdrawFromAccount: Account not found for accountNumber: ${data.accountNumber}`);
    throw new ApiError(httpStatus.NOT_FOUND, "Account not found");
  }
  logger.debug(`withdrawFromAccount: Account found. Account ID: ${account.id}, Status: ${account.status}`);
  
  if (account.customerId !== customerId) {
      logger.warn(`depositToAccount: Unauthorized deposit attempt. Customer ${customerId} tried to deposit to account ${account.id} owned by ${account.customerId}`);
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "You don't have permission to withdraw from this account"
      );
    }

  if (account.status !== "ACTIVE") {
    logger.warn(`withdrawFromAccount: Withdrawal attempt from non-ACTIVE account. Account ID: ${account.id}, Status: ${account.status}`);
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Cannot withdraw from ${account.status} account`,
    );
  }
  if (account.balance.toNumber() < data.amount) {
    logger.warn(`withdrawFromAccount: Insufficient balance for account ID: ${account.id}. Requested: ${data.amount}, Current: ${account.balance}`);
    throw new ApiError(httpStatus.BAD_REQUEST, "Insufficient balance");
  }

  const balanceBefore = account.balance;
  logger.info(`withdrawFromAccount: Starting transaction for account ID: ${account.id}. Amount: ${data.amount}, Balance before: ${balanceBefore}`);

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.account.update({
      where: { id: account.id },
      data: { balance: { decrement: data.amount } },
    });
    logger.debug(`withdrawFromAccount: Account balance updated. Account ID: ${account.id}, New balance: ${updated.balance}`);


    const transactionTxRef = generateTransactionReference();
    const transaction = await tx.transaction.create({
      data: {
        fromAccountId: account.id,
        type: "WITHDRAWAL",
        category: "DEBIT",
        amount: data.amount,
        balanceAfter: updated.balance,
        status: "SUCCESS",
        narration: data.narration,
        reference: transactionTxRef,
      },
    });
    logger.debug(`withdrawFromAccount: Transaction log created. Transaction ID: ${transaction.id}, Reference: ${transactionTxRef}`);

    return { updated, transaction };
  });

  logger.info(`withdrawFromAccount: Transaction completed successfully for account ID: ${account.id}. New balance: ${result.updated.balance}`);

  res.status(httpStatus.OK).json({
    success: true,
    message: "Withdrawal successful",
    account: {
      id: account.id,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      status: account.status,
      balanceBefore,
      balanceAfter: result.updated.balance,
      currency: account.currency,
      customer: {
        id: account.customer.id,
        firstName: account.customer.firstName,
        lastName: account.customer.lastName,
        email: account.customer.email,
      },
    },
    transaction: {
      id: result.transaction.id,
      reference: result.transaction.reference,
      transferReference: result.transaction.transferReference || null,
      type: result.transaction.type,
      category: result.transaction.category,
      amount: result.transaction.amount,
      balanceAfter: result.transaction.balanceAfter,
      status: result.transaction.status,
      narration: result.transaction.narration,
      createdAt: result.transaction.createdAt,
      updatedAt: result.transaction.updatedAt,
    },
  });
  logger.info(`withdrawFromAccount: Withdrawal successful response sent for account ID: ${account.id}.`);
});

const transferBetweenAccounts = Asyncly(async (req: Request, res: Response) => {
  const customerId = req.currentUser.id;
  const data = transactionValidation.transferSchema.parse(req.body);

  const fromAccount = await prisma.account.findUnique({
    where: { accountNumber: data.fromAccountNumber},
    include: { customer: true },
  });
  const toAccount = await prisma.account.findUnique({
    where: { accountNumber: data.toAccountNumber },
    include: { customer: true },
  });

  if (!fromAccount)
    throw new ApiError(httpStatus.NOT_FOUND, "Sender account not found");
  if (!toAccount)
    throw new ApiError(httpStatus.NOT_FOUND, "Recipient account not found");
    
    if (fromAccount.customerId !== customerId) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          "You don't have permission to transfer from this account"
        );
      }

  if (fromAccount.status !== "ACTIVE" || toAccount.status !== "ACTIVE") {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "One of the accounts is not active",
    );
  }

  if (fromAccount.balance.toNumber() < data.amount) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Insufficient balance");
  }
  
  if (fromAccount.accountNumber === toAccount.accountNumber) {
     throw new ApiError(
       httpStatus.BAD_REQUEST,
       "Cannot transfer to the same account"
     );
   }

  // Save balances before update
  const fromBalanceBefore = fromAccount.balance;
  const toBalanceBefore = toAccount.balance;

  const result = await prisma.$transaction(async (tx) => {
    // Debit sender
    const updatedFrom = await tx.account.update({
      where: { id: fromAccount.id },
      data: { balance: { decrement: data.amount } },
    });

    // Credit receiver
    const updatedTo = await tx.account.update({
      where: { id: toAccount.id },
      data: { balance: { increment: data.amount } },
    });

    // Generate references
    const sreference = generateTransactionReference();
    const rreference = generateTransactionReference();
    const transferRef = generateTransferReference();

    // Create sender transaction
    const senderTransaction = await tx.transaction.create({
      data: {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        type: "TRANSFER_OUT",
        category: "DEBIT",
        amount: data.amount,
        balanceAfter: updatedFrom.balance,
        status: "SUCCESS",
        reference: sreference,
        transferReference: transferRef,
        narration: data.narration,
      },
    });

    // Create receiver transaction
    const receiverTransaction = await tx.transaction.create({
      data: {
        fromAccountId: fromAccount.id,
        toAccountId: toAccount.id,
        type: "TRANSFER_IN",
        category: "CREDIT",
        amount: data.amount,
        balanceAfter: updatedTo.balance,
        status: "SUCCESS",
        reference: rreference,
        transferReference: transferRef,
        narration: data.narration,
      },
    });

    return {
      transferRef,
      amount: toMoney(data.amount),
      sender: {
        accountNumber: fromAccount.accountNumber,
        customerName: `${fromAccount.customer.firstName} ${fromAccount.customer.lastName}`,
        email: fromAccount.customer.email,
        balanceBefore: fromBalanceBefore,
        balanceAfter: updatedFrom.balance,
      },
      receiver: {
        accountNumber: toAccount.accountNumber,
        customerName: `${toAccount.customer.firstName} ${toAccount.customer.lastName}`,
        email: toAccount.customer.email,
        balanceBefore: toBalanceBefore,
        balanceAfter: updatedTo.balance,
      },
      transactions: {
        sender: senderTransaction,
        receiver: receiverTransaction,
      },
    };
  });

  res.status(httpStatus.OK).json({
    success: true,
    message: "Transfer successful",
    transfer: result,
  });
});


const getTransactions = Asyncly(async (req: Request, res: Response) => {
  const customerId = req.currentUser.id;
  const { accountNumber } = req.params;

 
  const account = await prisma.account.findUnique({
    where: { accountNumber },
  });
  
  if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Account not found");
  

  if (account.customerId !== customerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "You don't have access to this account");
  }

  // Paginate transactions
  const pResults = await withPagination({
    model: "transaction",
    req,
    res,
  });

  const cleanResults = removeNullsDeep(pResults);
  res.json(cleanResults);
});

const getTransactionById = Asyncly(async (req: Request, res: Response) => {
  const customerId = req.currentUser.id;
  const { id } = req.params;

  if (!id) throw new ApiError(httpStatus.BAD_REQUEST, "id is required");

  const t = await prisma.transaction.findUnique({
    where: { id },
    include: {
      fromAccount: { select: { customerId: true } },
      toAccount: { select: { customerId: true } },
    },
  });

  if (!t) throw new ApiError(httpStatus.NOT_FOUND, "transaction not found");
  
  
  const ownsTransaction =
    (t.fromAccount && t.fromAccount.customerId === customerId) ||
    (t.toAccount && t.toAccount.customerId === customerId);


  if (!ownsTransaction) {
    throw new ApiError(httpStatus.NOT_FOUND, "transaction with requested id not found");
  }

  const cleanResults = removeNullsDeep(t);
  res.status(httpStatus.OK).json({
    success: true,
    message: "Returned transaction with id successfully",
    cleanResults,
  });
});









export const transactionsController = {
  depositToAccount,
  withdrawFromAccount,
  transferBetweenAccounts,
  getTransactions,
  getTransactionById
};
