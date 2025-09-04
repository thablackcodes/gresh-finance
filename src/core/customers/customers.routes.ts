import express from "express";
import { customerController } from "./customers.controllers";
import { customerValidation } from "./customers.validation";
import { requireAuth, validate } from "../../middlewares";

const customerRoutes = express.Router();


/**
 * @swagger
 * /customers/{accountNumber}:
 *   get:
 *     summary: Get customer account details
 *     tags: [Customer]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer's account number
 *     responses:
 *       200:
 *         description: Customer account details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerAccountDetails'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
customerRoutes.get(
  "/:accountNumber",
  requireAuth,
  customerController.getAccountDetails,
);

/**
 * @swagger
 * /customers/{accountNumber}:
 *   put:
 *     summary: Update customer account details
 *     tags: [Customer]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer's account number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountType:
 *                 type: string
 *                 enum: ["SAVINGS", "CURRENT"]
 *                 description: The new account type for the customer.
 *               status:
 *                 type: string
 *                 enum: ["ACTIVE", "FROZEN", "CLOSED"]
 *                 description: The new status for the customer account.
 *             anyOf:
 *               - required: [accountType]
 *               - required: [status]
 *             description: At least one field (accountType or status) must be provided.
 *             example:
 *               accountType: "SAVINGS"
 *             example2:
 *               status: "FROZEN"
 *     responses:
 *       200:
 *         description: Customer account details updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerAccountDetails'
 *       400:
 *         description: Bad request, validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
customerRoutes.put(
  "/:accountNumber",
  requireAuth,
  validate(customerValidation.updateCustomerDetailsSchema),
  customerController.updateCustomerDetails,
);



/**
 * @swagger
 * /customers/{accountNumber}:
 *   delete:
 *     summary: Close a customer account
 *     tags: [Customer]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: The customer's account number to close
 *     responses:
 *       200:
 *         description: Customer account closed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Customer account closed successfully.
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found
 */
customerRoutes.delete(
  "/:accountNumber",
  requireAuth,
  customerController.closeCustomerAccount,
);


/**
 * @swagger
 * /customers/sub-account:
 *   post:
 *     summary: Create a new sub-account for an existing customer
 *     tags: [Customer]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountType
 *             properties:
 *               accountType:
 *                 type: string
 *                 enum: ["SAVINGS", "HIDA", "CURRENT"]
 *                 description: The type of account to create.
 *               currency:
 *                 type: string
 *                 description: The currency for the new account (e.g., "USD", "GBP").
 *             example:
 *               accountType: "SAVINGS"
 *               currency: "NGN"
 *     responses:
 *       201:
 *         description: Sub-account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomerAccountDetails'
 *       400:
 *         description: Bad request, validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Customer not found (if the customer identifier is implied from auth token)
 */
customerRoutes.post(
  '/sub-account',
  requireAuth,
  validate(customerValidation.createAccountSchema),
  customerController.createAccountForCustomer
)

export { customerRoutes };
