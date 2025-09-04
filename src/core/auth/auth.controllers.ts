import { ApiError } from "../../middlewares";
import { Asyncly } from "../../extension";
import { prisma } from "../../db";
import { logger } from "../../config";
import { authValidation } from "./auth.validation";
import { Request, Response } from "express";
import { HashService, TokenService, httpStatus } from "../../utils";
import { generateAccountNumber } from "../../helpers";




const registerCustomer = Asyncly(async (req: Request, res: Response) => {
  const data = authValidation.createUserSchema.parse(req.body);

  logger.info(`Registering user with email: ${data.email}`);

  const existingCustomer = await prisma.customer.findUnique({
    where: { email: data.email },
    select: { id: true, email: true, isVerified: true },
  });

  if (existingCustomer) {
    if (!existingCustomer.isVerified) {
      throw new ApiError(
        httpStatus.CONFLICT,
        "Account not verified, kindly login to verify"
      );
    }
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Customer with this email already exists"
    );
  }

  const hashedPassword = await HashService.hashPassword(data.password);
  logger.info("Password hashed successfully");

  const accountNumber = generateAccountNumber();

  // Wrap in transaction
  const { customer, account } = await prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: hashedPassword,
        isActive: true,
        isVerified: true, 
      },
    });

    logger.info(`User registered with ID: ${customer.id}`);

    const account = await tx.account.create({
      data: {
        accountNumber,
        customerId: customer.id,
        accountType: "SAVINGS",
        balance: 0,
        currency: "NGN",
      },
    });

    return { customer, account };
  });

  res.status(httpStatus.CREATED).json({
    message:
      "User registered successfully. Kindly login to continue.",
    user: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      isActive: customer.isActive,
      isVerified: customer.isVerified,
    },
    account: {
      accountNumber: account.accountNumber,
      balance: account.balance,
      currency: account.currency,
      accountType: account.accountType,
    },
  });
});



const loginCustomer = Asyncly(async (req: Request, res: Response) => {
  logger.info("Logging in customer");

  const data = authValidation.loginSchema.parse(req.body);

  const customer = await prisma.customer.findUnique({
    where: { email: data.email },
  });

  if (!customer) {
    throw new ApiError(httpStatus.NOT_FOUND, "Customer not found");
  }

  if (!customer.isActive) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Account is blocked, please contact support"
    );
  }

  if (!customer.isVerified) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Account not verified, kindly complete verification"
    );
  }

  const isValidPassword = await HashService.comparePassword(
    data.password,
    customer.password
  );

  if (!isValidPassword) {
    throw new ApiError(httpStatus.FORBIDDEN, "Invalid email or password");
  }

  const tokenPayload: AuthUser = {
    id: customer.id,
    email: customer.email,
    name: `${customer.firstName} ${customer.lastName}`,
  };

  const accessToken = TokenService.generateUserToken(tokenPayload);
  const refreshToken = TokenService.generateUserRefreshToken(tokenPayload);

  logger.info(`User logged in successfully with ID: ${customer.id}`);

  res.status(httpStatus.OK).json({
    message: "User logged in successfully",
    user: {
      id: customer.id,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      isActive: customer.isActive,
      isVerified: customer.isVerified,
    },
    accessToken,
    refreshToken,
  });
});



export const authController = {
  registerCustomer,
  loginCustomer,
};