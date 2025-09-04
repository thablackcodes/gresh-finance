import { ApiError } from "../../middlewares";
import { Asyncly } from "../../extension";
import { prisma } from "../../db";
import { logger } from "../../config";
import { Request, Response } from "express";
import { customerValidation } from "./customers.validation";
import { generateAccountNumber } from "../../helpers";
import { httpStatus } from "../../utils";


const getAccountDetails = Asyncly(
  async (req: Request, res: Response) => {
    const customerId = req.currentUser.id;

    const accountNumber = req.params.accountNumber;

    logger.info(
      `Fetching account details for customer ID: ${customerId}, Account Number: ${accountNumber}`,
    );


    const account = await prisma.account.findFirst({
      where: {
        accountNumber: accountNumber,
        customerId: customerId, 
      },
    });

    if (!account) {
      throw new ApiError(httpStatus.NOT_FOUND, "Account not found or unauthorized.");
    }

    res.status(httpStatus.OK).json({
      message: "Account details retrieved successfully",
      account: {
        accountNumber: account.accountNumber,
        accountType: account.accountType,
        balance: account.balance,
        currency: account.currency,
      },
    });
  },
);


const updateCustomerDetails = Asyncly(async (req: Request, res: Response) => {
  const customerId = req.currentUser?.id;
  const accountNumber = req.params.accountNumber;
  
  const data = customerValidation.updateCustomerDetailsSchema.parse(req.body);
  
  const account = await prisma.account.findFirst({
    where: { accountNumber:accountNumber, customerId:customerId },
  });
  
  if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Account not found");

  const updatedAccount = await prisma.account.update({
    where: { id: account.id },
    data,
  });

  res.status(httpStatus.OK).json({
    message: "Account updated successfully",
    account: updatedAccount,
  });
});


const closeCustomerAccount = Asyncly(async (req: Request, res: Response) => {
  const customerId = req.currentUser?.id;
  const accountNumber = req.params.accountNumber;

  const account = await prisma.account.findFirst({
    where: { accountNumber:accountNumber, customerId:customerId },
  });

  if (!account) throw new ApiError(httpStatus.NOT_FOUND, "Account not found");

  if (account.status === "CLOSED") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Account is already closed");
  }

  const closedAccount = await prisma.account.update({
    where: { id: account.id },
    data: { status: "CLOSED"},
  });

  res.status(httpStatus.OK).json({
    message: "Account closed successfully",
    account: closedAccount,
  });
});


const createAccountForCustomer = Asyncly(async (req: Request, res: Response) => {
  const data = customerValidation.createAccountSchema.parse(req.body);
  const customerId = req.currentUser.id;

  const accountNumber = generateAccountNumber();

  const account = await prisma.account.create({
    data: {
      customerId,
      accountNumber,
      accountType: data.accountType,
      currency: "NGN",
      balance: 0,
      status: "ACTIVE",
    },
  });

  res.status(httpStatus.CREATED).json({
    message: "New account created successfully",
    account: {
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      balance: account.balance,
      currency: account.currency,
      status: account.status,
    },
  });
});


const getCustomerById = Asyncly(async(req:Request, res:Response)=>{
  const customerId = req.currentUser.id;
  const { id } = req.params;
  if (!id) throw new ApiError(httpStatus.BAD_REQUEST, "id is required");
  
  const c = await prisma.customer.findUnique({
    where: {id:customerId}
  })
  if(!c) throw new ApiError(httpStatus.NOT_FOUND, "customer with requested id not found")
  
  res.status(httpStatus.OK).json({
    success:true,
    message:"fetched customer successfully",
    c,
  })
})

export const customerController = {
  getAccountDetails,
  updateCustomerDetails,
  closeCustomerAccount,
  createAccountForCustomer,
  getCustomerById
}