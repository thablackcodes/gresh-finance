import { Request, Response } from "express";
import { transactionsController } from "./transactions.controller";
import { prisma } from "../../db";
import { Decimal } from "@prisma/client/runtime/library"; 

// your mock setup
jest.mock("../../config", () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }
}));

// Mock utilities
jest.mock("../../utils", () => ({
  httpStatus: {
    OK: 200,
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    BAD_REQUEST: 400,
    CREATED: 201,
  },
  withPagination: jest.fn(),
}));

// Mock ApiError
jest.mock("../../middlewares", () => ({
  ApiError: jest.fn().mockImplementation((status, message) => {
    const error = new Error(message);
    (error as any).status = status;
    return error;
  }),
}));

// Asyncly mock
jest.mock("../../extension", () => ({
  Asyncly: (fn: any) => {
    return async (req: Request, res: Response, next: any) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  },
}));

// Mock validation
jest.mock("./transaction.validation", () => ({
  transactionValidation: {
    depositSchema: {
      parse: jest.fn(),
    },
    withdrawalSchema: {
      parse: jest.fn(),
    },
    transferSchema: {
      parse: jest.fn(),
    },
  },
}));

// Mock helper functions
jest.mock("../../helpers", () => ({
  generateTransactionReference: jest.fn(() => "TXN_REF_123"),
  generateTransferReference: jest.fn(() => "TRANSFER_REF_123"),
}));

// Mock transaction utils
jest.mock("./transaction.utils", () => ({
  toMoney: jest.fn((amount) => amount),
  removeNullsDeep: jest.fn((data) => data),
}));

// Mock prisma - ADDED transaction.findUnique
jest.mock("../../db", () => ({
  prisma: {
    account: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transaction: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("Transaction Controller", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn(() => ({ json: mockJson }));
    mockNext = jest.fn();

    mockReq = {
      body: {},
      params: {},
      currentUser: { // Mock current user
        id: "cust1",
        email: "john@example.com",
        name: "John Doe"
      },
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    // Mock $transaction to execute callback
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      return await callback(prisma);
    });
  });

  describe("depositToAccount", () => {
    const validDepositData = {
      accountNumber: "3771090572",
      amount: 100,
      narration: "Test deposit",
    };

    it("should deposit to account successfully", async () => {
      const mockAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        balance: new Decimal(50),
        status: "ACTIVE",
        currency: "NGN",
        customerId: "cust1", 
      };

      const mockUpdatedAccount = {
        id: "acc1",
        balance: new Decimal(150),
      };

      const mockTransaction = {
        id: "tx1",
        reference: "TXN_REF_123",
        type: "DEPOSIT",
        category: "CREDIT",
        amount: 100,
        status: "SUCCESS",
        narration: "Test deposit",
      };

      mockReq.body = validDepositData;

      const { transactionValidation } = require("./transaction.validation");
      transactionValidation.depositSchema.parse.mockReturnValue(validDepositData);

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.account.update as jest.Mock).mockResolvedValue(mockUpdatedAccount);
      (prisma.transaction.create as jest.Mock).mockResolvedValue(mockTransaction);

      await transactionsController.depositToAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { accountNumber: "3771090572" },
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: "Deposit successful",
      }));
    });

    it("should call next with error if account not found", async () => {
      mockReq.body = validDepositData;

      const { transactionValidation } = require("./transaction.validation");
      transactionValidation.depositSchema.parse.mockReturnValue(validDepositData);

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(null);

      await transactionsController.depositToAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account not found",
          status: 404,
        })
      );
    });

    it("should call next with error if account is not active", async () => {
      const mockAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        balance: new Decimal(50),
        status: "SUSPENDED",
        customerId: "cust1",
      };

      mockReq.body = validDepositData;

      const { transactionValidation } = require("./transaction.validation");
      transactionValidation.depositSchema.parse.mockReturnValue(validDepositData);

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      await transactionsController.depositToAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Cannot deposit to SUSPENDED account",
          status: 403,
        })
      );
    });

    // ADDED: Test for ownership verification
    it("should call next with error if account doesn't belong to user", async () => {
      const mockAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        balance: new Decimal(50),
        status: "ACTIVE",
        currency: "NGN",
        customerId: "other-customer", 
      };

      mockReq.body = validDepositData;

      const { transactionValidation } = require("./transaction.validation");
      transactionValidation.depositSchema.parse.mockReturnValue(validDepositData);

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      await transactionsController.depositToAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You don't have permission to deposit to this account",
          status: 403,
        })
      );
    });
  });

  describe("withdrawFromAccount", () => {
    const validWithdrawalData = {
      accountNumber: "3771090572",
      amount: 50,
      narration: "Test withdrawal",
    };

    it("should withdraw from account successfully", async () => {
      const mockAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        accountType: "SAVINGS",
        balance: new Decimal(150),
        status: "ACTIVE",
        currency: "NGN",
        customerId: "cust1", // Match current user
        customer: {
          id: "cust1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
      };

      const mockUpdatedAccount = {
        id: "acc1",
        balance: new Decimal(100),
      };

      const mockTransaction = {
        id: "tx2",
        reference: "TXN_REF_123",
        transferReference: null,
        type: "WITHDRAWAL",
        category: "DEBIT",
        amount: 50,
        balanceAfter: new Decimal(100),
        status: "SUCCESS",
        narration: "Test withdrawal",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReq.body = validWithdrawalData;

      const { transactionValidation } = require("./transaction.validation");
      transactionValidation.withdrawalSchema.parse.mockReturnValue(validWithdrawalData);

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.account.update as jest.Mock).mockResolvedValue(mockUpdatedAccount);
      (prisma.transaction.create as jest.Mock).mockResolvedValue(mockTransaction);

      await transactionsController.withdrawFromAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: "Withdrawal successful",
      }));
    });

    //  Test for ownership verification
    it("should call next with error if account doesn't belong to user", async () => {
      const mockAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        balance: new Decimal(150),
        status: "ACTIVE",
        customerId: "other-customer", // Different customer
        customer: {
          id: "other-customer",
          firstName: "Other",
          lastName: "User",
          email: "other@example.com",
        },
      };

      mockReq.body = validWithdrawalData;

      const { transactionValidation } = require("./transaction.validation");
      transactionValidation.withdrawalSchema.parse.mockReturnValue(validWithdrawalData);

      (prisma.account.findUnique as jest.Mock).mockResolvedValue(mockAccount);

      await transactionsController.withdrawFromAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You don't have permission to withdraw from this account",
          status: 403,
        })
      );
    });
  });

  describe("transferBetweenAccounts", () => {
    const validTransferData = {
      fromAccountNumber: "3771090572",
      toAccountNumber: "3771090574",
      amount: 30,
      narration: "Test transfer",
    };

    it("should transfer between accounts successfully", async () => {
      const mockFromAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        balance: new Decimal(100),
        status: "ACTIVE",
        customerId: "cust1", // current user
        customer: {
          id: "cust1",
          firstName: "John",
          lastName: "Doe",
          email: "john@example.com",
        },
      };

      const mockToAccount = {
        id: "acc2",
        accountNumber: "3771090574",
        balance: new Decimal(50),
        status: "ACTIVE",
        customer: {
          id: "cust2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        },
      };

      const mockUpdatedFromAccount = { id: "acc1", balance: new Decimal(70) };
      const mockUpdatedToAccount = { id: "acc2", balance: new Decimal(80) };

      const mockSenderTransaction = {
        reference: "TXN_REF_123",
        transferReference: "TRANSFER_REF_123",
        type: "TRANSFER_OUT",
        category: "DEBIT",
        amount: 30,
        status: "SUCCESS",
        narration: "Test transfer",
      };

      const mockReceiverTransaction = {
        reference: "TXN_REF_124",
        transferReference: "TRANSFER_REF_123",
        type: "TRANSFER_IN",
        category: "CREDIT",
        amount: 30,
        status: "SUCCESS",
        narration: "Test transfer",
      };

      mockReq.body = validTransferData;

      const { transactionValidation } = require("./transaction.validation");
      transactionValidation.transferSchema.parse.mockReturnValue(validTransferData);

      (prisma.account.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFromAccount)
        .mockResolvedValueOnce(mockToAccount);

      (prisma.account.update as jest.Mock)
        .mockResolvedValueOnce(mockUpdatedFromAccount)
        .mockResolvedValueOnce(mockUpdatedToAccount);

      (prisma.transaction.create as jest.Mock)
        .mockResolvedValueOnce(mockSenderTransaction)
        .mockResolvedValueOnce(mockReceiverTransaction);

      await transactionsController.transferBetweenAccounts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: "Transfer successful",
      }));
    });

    // ADDED: Test for ownership verification
    it("should call next with error if fromAccount doesn't belong to user", async () => {
      const mockFromAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        balance: new Decimal(100),
        status: "ACTIVE",
        customerId: "other-customer", // Different customer
        customer: {
          id: "other-customer",
          firstName: "Other",
          lastName: "User",
          email: "other@example.com",
        },
      };

      const mockToAccount = {
        id: "acc2",
        accountNumber: "3771090574",
        balance: new Decimal(50),
        status: "ACTIVE",
        customer: {
          id: "cust2",
          firstName: "Jane",
          lastName: "Smith",
          email: "jane@example.com",
        },
      };

      mockReq.body = validTransferData;

      const { transactionValidation } = require("./transaction.validation");
      transactionValidation.transferSchema.parse.mockReturnValue(validTransferData);

      (prisma.account.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockFromAccount)
        .mockResolvedValueOnce(mockToAccount);

      await transactionsController.transferBetweenAccounts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "You don't have permission to transfer from this account",
          status: 403,
        })
      );
    });
  });

  // ADDED: getTransactionById tests
  describe("getTransactionById", () => {
    it("should get transaction by id successfully when user owns fromAccount", async () => {
      const mockTransaction = {
        id: "tx1",
        fromAccountId: "acc1",
        toAccountId: "acc2",
        type: "TRANSFER",
        amount: new Decimal(100),
        status: "SUCCESS",
        balanceAfter: new Decimal(200),
        category: "DEBIT",
        narration: "Test transfer",
        reference: "TXN_REF_123",
        createdAt: new Date(),
        updatedAt: new Date(),
        fromAccount: {
          customerId: "cust1",
        },
        toAccount: {
          customerId: "cust2",
        },
      };

      mockReq.params = { id: "tx1" };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);

      const { removeNullsDeep } = require("./transaction.utils");
      (removeNullsDeep as jest.Mock).mockReturnValue(mockTransaction);

      await transactionsController.getTransactionById(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.transaction.findUnique).toHaveBeenCalledWith({
        where: { id: "tx1" },
        include: {
          fromAccount: { select: { customerId: true } },
          toAccount: { select: { customerId: true } },
        },
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: "Returned transaction with id successfully",
        cleanResults: mockTransaction,
      });
    });

    it("should call next with error if transaction not found", async () => {
      mockReq.params = { id: "nonexistent-id" };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(null);

      await transactionsController.getTransactionById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "transaction not found",
          status: 404,
        })
      );
    });

    it("should call next with error if user doesn't own the transaction", async () => {
      const mockTransaction = {
        id: "tx1",
        fromAccountId: "acc1",
        toAccountId: "acc2",
        type: "TRANSFER",
        amount: new Decimal(100),
        status: "SUCCESS",
        balanceAfter: new Decimal(200),
        category: "DEBIT",
        narration: "Test transfer",
        reference: "TXN_REF_123",
        createdAt: new Date(),
        updatedAt: new Date(),
        fromAccount: {
          customerId: "other-customer", // Different customer
        },
        toAccount: {
          customerId: "another-customer", // Different customer
        },
      };

      mockReq.params = { id: "tx1" };

      (prisma.transaction.findUnique as jest.Mock).mockResolvedValue(mockTransaction);

      await transactionsController.getTransactionById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "transaction with requested id not found",
          status: 404,
        })
      );
    });
  });
});