import { Request, Response } from "express";
import { authController } from "./auth.controllers";
import { prisma } from "../../db";
import { HashService, TokenService } from "../../utils";

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
    CREATED: 201,
    OK: 200,
    NOT_FOUND: 404,
    FORBIDDEN: 403,
    BAD_REQUEST: 400,
    CONFLICT: 409,
  },
  HashService: {
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
  },
  TokenService: {
    generateUserToken: jest.fn(),
    generateUserRefreshToken: jest.fn(),
  },
}));

// Mock ApiError
jest.mock("../../middlewares", () => ({
  ApiError: jest.fn().mockImplementation((status, message) => {
    const error = new Error(message);
    (error as any).status = status;
    return error;
  }),
}));

// Mock Asyncly wrapper
jest.mock("../../extension", () => ({
  Asyncly: jest.fn((fn) => {
    return jest.fn((req, res, next) => {
      return Promise.resolve(fn(req, res, next)).catch(next);
    });
  }),
}));

// Mock validation
jest.mock("./auth.validation", () => ({
  authValidation: {
    createUserSchema: {
      parse: jest.fn(),
    },
    loginSchema: {
      parse: jest.fn(),
    },
  },
}));



// Mock helper functions
jest.mock("../../helpers", () => ({
  generateAccountNumber: jest.fn(() => "3771090572"),
}));

// Mock prisma
jest.mock("../../db", () => ({
  prisma: {
    customer: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    account: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("Auth Controller", () => {
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
    };
    
    mockRes = {
      status: mockStatus,
      json: mockJson,
    };

    // Set up the $transaction mock
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return await callback(prisma);
    });
  });

  describe("registerCustomer", () => {
    const validUserData = {
      firstName: "John",
      lastName: "Doe",
      email: "john@gmail.com",
      password: "Password123!",
      confirmPassword: "Password123!",
    };

    it("should register a new customer successfully", async () => {
      const mockCustomer = {
        id: "cust1",
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        isActive: true,
        isVerified: true,
      };

      const mockAccount = {
        accountNumber: "3771090572",
        balance: 0,
        currency: "NGN",
        accountType: "SAVINGS",
      };

      mockReq.body = validUserData;

      // Mock validation
      const { authValidation } = require("./auth.validation");
      authValidation.createUserSchema.parse.mockReturnValue(validUserData);

      // Mock existing customer check (none exists)
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      // Mock password hashing
      (HashService.hashPassword as jest.Mock).mockResolvedValue("hashedPassword123");

      // Mock database operations
      (prisma.customer.create as jest.Mock).mockResolvedValue(mockCustomer);
      (prisma.account.create as jest.Mock).mockResolvedValue(mockAccount);

      // FIXED: Await the controller function call
      await authController.registerCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { email: "john@gmail.com" },
        select: { id: true, email: true, isVerified: true },
      });

      expect(HashService.hashPassword).toHaveBeenCalledWith("Password123!");

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: {
          firstName: "John",
          lastName: "Doe",
          email: "john@gmail.com",
          password: "hashedPassword123",
          isActive: true,
          isVerified: true,
        },
      });

      expect(prisma.account.create).toHaveBeenCalledWith({
        data: {
          accountNumber: "3771090572",
          customerId: "cust1",
          accountType: "SAVINGS",
          balance: 0,
          currency: "NGN",
        },
      });

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: "User registered successfully. Kindly login to continue.",
        user: {
          id: "cust1",
          firstName: "John",
          lastName: "Doe",
          email: "john@gmail.com",
          isActive: true,
          isVerified: true,
        },
        account: {
          accountNumber: "3771090572",
          balance: 0,
          currency: "NGN",
          accountType: "SAVINGS",
        },
      });
    });

    it("should call next with error if customer already exists and is verified", async () => {
      const existingCustomer = {
        id: "cust1",
        email: "john@gmail.com",
        isVerified: true,
      };

      mockReq.body = validUserData;

      const { authValidation } = require("./auth.validation");
      authValidation.createUserSchema.parse.mockReturnValue(validUserData);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(existingCustomer);

      await authController.registerCustomer(mockReq as Request, mockRes as Response, mockNext);

      
      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Customer with this email already exists",
          status: 400,
        })
      );
    });

    it("should call next with error if customer exists but is not verified", async () => {
      const existingCustomer = {
        id: "cust1",
        email: "john@gmail.com",
        isVerified: false,
      };

      mockReq.body = validUserData;

      const { authValidation } = require("./auth.validation");
      authValidation.createUserSchema.parse.mockReturnValue(validUserData);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(existingCustomer);

      await authController.registerCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account not verified, kindly login to verify",
          status: 409,
        })
      );
    });

    it("should call next with error on validation failure", async () => {
      const invalidData = {
        firstName: "",
        lastName: "Doe",
        email: "invalid-email",
        password: "weak",
        confirmPassword: "different",
      };

      mockReq.body = invalidData;

      const { authValidation } = require("./auth.validation");
      authValidation.createUserSchema.parse.mockImplementation(() => {
        throw new Error("Validation failed");
      });

      await authController.registerCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation failed",
        })
      );
    });
  });

  describe("loginCustomer", () => {
    const validLoginData = {
      email: "john@gmail.com",
      password: "Password123!",
    };

    it("should login customer successfully", async () => {
      const mockCustomer = {
        id: "cust1",
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        password: "hashedPassword123",
        isActive: true,
        isVerified: true,
      };

      const mockTokenPayload = {
        id: "cust1",
        email: "john@gmail.com",
        name: "John Doe",
      };

      mockReq.body = validLoginData;

      // Mock validation
      const { authValidation } = require("./auth.validation");
      authValidation.loginSchema.parse.mockReturnValue(validLoginData);

      // Mock database operations
      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      // Mock password comparison
      (HashService.comparePassword as jest.Mock).mockResolvedValue(true);

      // Mock token generation
      (TokenService.generateUserToken as jest.Mock).mockReturnValue("access-token-123");
      (TokenService.generateUserRefreshToken as jest.Mock).mockReturnValue("refresh-token-123");

      await authController.loginCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.customer.findUnique).toHaveBeenCalledWith({
        where: { email: "john@gmail.com" },
      });

      expect(HashService.comparePassword).toHaveBeenCalledWith(
        "Password123!",
        "hashedPassword123"
      );

      expect(TokenService.generateUserToken).toHaveBeenCalledWith(mockTokenPayload);
      expect(TokenService.generateUserRefreshToken).toHaveBeenCalledWith(mockTokenPayload);

      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        message: "User logged in successfully",
        user: {
          id: "cust1",
          firstName: "John",
          lastName: "Doe",
          email: "john@gmail.com",
          isActive: true,
          isVerified: true,
        },
        accessToken: "access-token-123",
        refreshToken: "refresh-token-123",
      });
    });

    it("should call next with error if customer not found", async () => {
      mockReq.body = validLoginData;

      const { authValidation } = require("./auth.validation");
      authValidation.loginSchema.parse.mockReturnValue(validLoginData);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);

      await authController.loginCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Customer not found",
          status: 404,
        })
      );
    });

    it("should call next with error if customer account is not active", async () => {
      const mockCustomer = {
        id: "cust1",
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        password: "hashedPassword123",
        isActive: false,
        isVerified: true,
      };

      mockReq.body = validLoginData;

      const { authValidation } = require("./auth.validation");
      authValidation.loginSchema.parse.mockReturnValue(validLoginData);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      await authController.loginCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account is blocked, please contact support",
          status: 403,
        })
      );
    });

    it("should call next with error if customer account is not verified", async () => {
      const mockCustomer = {
        id: "cust1",
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        password: "hashedPassword123",
        isActive: true,
        isVerified: false,
      };

      mockReq.body = validLoginData;

      const { authValidation } = require("./auth.validation");
      authValidation.loginSchema.parse.mockReturnValue(validLoginData);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);

      await authController.loginCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Account not verified, kindly complete verification",
          status: 403,
        })
      );
    });

    it("should call next with error if password is invalid", async () => {
      const mockCustomer = {
        id: "cust1",
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        password: "hashedPassword123",
        isActive: true,
        isVerified: true,
      };

      mockReq.body = validLoginData;

      const { authValidation } = require("./auth.validation");
      authValidation.loginSchema.parse.mockReturnValue(validLoginData);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);
      (HashService.comparePassword as jest.Mock).mockResolvedValue(false);

      await authController.loginCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Invalid email or password",
          status: 403,
        })
      );
    });

    it("should call next with error on validation failure", async () => {
      const invalidData = {
        email: "invalid-email",
        password: "short",
      };

      mockReq.body = invalidData;

      const { authValidation } = require("./auth.validation");
      authValidation.loginSchema.parse.mockImplementation(() => {
        throw new Error("Validation failed");
      });

      await authController.loginCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Validation failed",
        })
      );
    });
  });

  describe("Integration scenarios", () => {
    it("should call next with error on database transaction failure during registration", async () => {
      const validUserData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      mockReq.body = validUserData;

      const { authValidation } = require("./auth.validation");
      authValidation.createUserSchema.parse.mockReturnValue(validUserData);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);
      (HashService.hashPassword as jest.Mock).mockResolvedValue("hashedPassword123");

      // Mock transaction failure
      (prisma.$transaction as jest.Mock).mockRejectedValue(
        new Error("Database transaction failed")
      );

      await authController.registerCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Database transaction failed",
        })
      );
    });

    it("should call next with error on hash service failure during registration", async () => {
      const validUserData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        password: "Password123!",
        confirmPassword: "Password123!",
      };

      mockReq.body = validUserData;

      const { authValidation } = require("./auth.validation");
      authValidation.createUserSchema.parse.mockReturnValue(validUserData);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(null);
      (HashService.hashPassword as jest.Mock).mockRejectedValue(
        new Error("Hash service error")
      );

      await authController.registerCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Hash service error",
        })
      );
    });

    it("should call next with error on token generation failure during login", async () => {
      const mockCustomer = {
        id: "cust1",
        firstName: "John",
        lastName: "Doe",
        email: "john@gmail.com",
        password: "hashedPassword123",
        isActive: true,
        isVerified: true,
      };

      mockReq.body = {
        email: "john@gmail.com",
        password: "Password123!",
      };

      const { authValidation } = require("./auth.validation");
      authValidation.loginSchema.parse.mockReturnValue(mockReq.body);

      (prisma.customer.findUnique as jest.Mock).mockResolvedValue(mockCustomer);
      (HashService.comparePassword as jest.Mock).mockResolvedValue(true);
      (TokenService.generateUserToken as jest.Mock).mockImplementation(() => {
        throw new Error("Token generation failed");
      });

      await authController.loginCustomer(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Token generation failed",
        })
      );
    });
  });
});