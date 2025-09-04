import { Request, Response } from "express";
import { customerController } from "./customers.controllers";
import { prisma } from "../../db";
import { Decimal } from "@prisma/client/runtime/library";

// Mock logger
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
    CREATED: 201,
    NOT_FOUND: 404,
    BAD_REQUEST: 400,
  },
  generateAccountNumber: jest.fn(() => "3771090572"),
}));

// Mock ApiError
jest.mock("../../middlewares", () => ({
  ApiError: jest.fn().mockImplementation((status, message) => {
    const error = new Error(message);
    (error as any).status = status;
    return error;
  }),
}));

// Mock Asyncly
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
jest.mock("./customers.validation", () => ({
  customerValidation: {
    updateCustomerDetailsSchema: {
      parse: jest.fn((data) => data),
    },
    createAccountSchema: {
      parse: jest.fn((data) => data),
    },
  },
}));

// Mock prisma - ADDED customer.findUnique
jest.mock("../../db", () => ({
  prisma: {
    account: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Customer Controller", () => {
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
      currentUser: { id: "cust1", email: "cust1@gmail.com", name: "cust" },
    };

    mockRes = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe("getAccountDetails", () => {
    it("should return account details successfully", async () => {
      const mockAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        accountType: "SAVINGS",
        balance: new Decimal(150),
        currency: "NGN",
        customerId: "cust1",
      };

      mockReq.params = { accountNumber: "3771090572" };

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);

      await customerController.getAccountDetails(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: {
          accountNumber: "3771090572",
          customerId: "cust1",
        },
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Account details retrieved successfully",
        account: {
          accountNumber: "3771090572",
          accountType: "SAVINGS",
          balance: new Decimal(150),
          currency: "NGN",
        },
      });
    });

    it("should call next with error if account not found", async () => {
      mockReq.params = { accountNumber: "9999999999" };

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(null);

      await customerController.getAccountDetails(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account not found or unauthorized.",
          status: 404,
        })
      );
    });
  });

  describe("updateCustomerDetails", () => {
    const validUpdateData = {
      accountType: "CURRENT",
      status: "INACTIVE",
    };

    it("should update account details successfully", async () => {
      const mockAccount = { id: "acc1", accountNumber: "3771090572", customerId: "cust1" };
      const mockUpdatedAccount = {
        id: "acc1",
        accountNumber: "3771090572",
        accountType: "CURRENT",
        status: "INACTIVE",
        balance: new Decimal(100),
        currency: "NGN",
      };

      mockReq.params = { accountNumber: "3771090572" };
      mockReq.body = validUpdateData;

      const { customerValidation } = require("./customers.validation");
      customerValidation.updateCustomerDetailsSchema.parse.mockReturnValue(validUpdateData);

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.account.update as jest.Mock).mockResolvedValue(mockUpdatedAccount);

      await customerController.updateCustomerDetails(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc1" },
        data: validUpdateData,
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Account updated successfully",
        account: {
          id: "acc1",
          accountNumber: "3771090572",
          accountType: "CURRENT",
          status: "INACTIVE",
          balance: new Decimal(100),
          currency: "NGN",
        },
      });
    });
  });

  describe("closeCustomerAccount", () => {
    it("should close account successfully", async () => {
      const mockAccount = { id: "acc1", accountNumber: "3771090572", customerId: "cust1", status: "ACTIVE" };
      const mockClosedAccount = { ...mockAccount, status: "CLOSED", isActive: false };

      mockReq.params = { accountNumber: "3771090572" };

      (prisma.account.findFirst as jest.Mock).mockResolvedValue(mockAccount);
      (prisma.account.update as jest.Mock).mockResolvedValue(mockClosedAccount);

      await customerController.closeCustomerAccount(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: "acc1" },
        data: { status: "CLOSED" },
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: "Account closed successfully",
        account: mockClosedAccount,
      });
    });
  });

  describe("createAccountForCustomer", () => {
    const validCreateData = {
      accountType: "CURRENT",
      currency: "NGN",
    };

    it("should create new account successfully", async () => {
      const mockAccount = {
        id: "acc1",
        customerId: "cust1",
        accountNumber: "any-generated-number",
        accountType: "CURRENT",
        currency: "NGN",
        balance: 0,
        status: "ACTIVE",
      };

      mockReq.body = { currency: "NGN" };

      const { customerValidation } = require("./customers.validation");
      
      customerValidation.createAccountSchema.parse.mockReturnValue({
        currency: "NGN",
        accountType: "CURRENT" 
      });

      (prisma.account.create as jest.Mock).mockResolvedValue(mockAccount);

      await customerController.createAccountForCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          customerId: "cust1",
          accountNumber: expect.any(String),
          accountType: "CURRENT",
          currency: "NGN",
          balance: 0,
          status: "ACTIVE",
        }),
      });

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: "New account created successfully",
        account: expect.objectContaining({
          accountNumber: expect.any(String),
          accountType: "CURRENT",
          balance: 0,
          currency: "NGN",
          status: "ACTIVE",
        }),
      });
    });

    it("should use default account type if not provided", async () => {
      const mockAccount = {
        id: "acc1",
        customerId: "cust1",
        accountNumber: "any-generated-number",
        accountType: "CURRENT",
        currency: "NGN",
        balance: 0,
        status: "ACTIVE",
      };

      mockReq.body = { currency: "NGN" };

      const { customerValidation } = require("./customers.validation");
      customerValidation.createAccountSchema.parse.mockReturnValue({ currency: "NGN", accountType: "CURRENT" });

      (prisma.account.create as jest.Mock).mockResolvedValue(mockAccount);

      await customerController.createAccountForCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accountType: "CURRENT",
            currency: "NGN",
            accountNumber: expect.any(String),
          }),
        })
      );
    });

    it("should call next with error if no fields provided", async () => {
      mockReq.body = {};

      const { customerValidation } = require("./customers.validation");
      customerValidation.createAccountSchema.parse.mockImplementation(() => {
        throw new Error("At least one field must be provided.");
      });

      await customerController.createAccountForCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockNext.mock.calls[0][0]).toBeInstanceOf(Error);
    });
  });

  // ADDED: getCustomerById tests
  describe("getCustomerById", () => {
    it("should get customer by id successfully", async () => {
      const mockCustomer = {
        id: "cust1",
        email: "john@example.com",
        firstName: "John",
        lastName: "Doe",
        phoneNumber: "1234567890",
        dateOfBirth: new Date("1990-01-01"),
        status: "ACTIVE",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockReq.params = { id: "cust1" };

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      await customerController.getCustomerById(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { id: "cust1" },
      });

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        success: true,
        message: "fetched customer successfully",
        c: mockCustomer,
      });
    });

    it("should call next with error if customer not found", async () => {
      mockReq.params = { id: "nonexistent-id" };

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await customerController.getCustomerById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "customer with requested id not found",
          status: 404,
        })
      );
    });

    it("should call next with error if id is not provided", async () => {
      mockReq.params = {};

      await customerController.getCustomerById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "id is required",
          status: 400,
        })
      );
    });
  });
});

