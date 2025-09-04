import express from "express";
import { transactionValidation } from "./transaction.validation";
import { transactionsController } from "./transactions.controller";
import { requireAuth, validate } from "../../middlewares";


const transactionRoutes = express.Router();


/**
 * @swagger
 * /transaction/deposit:
 *   post:
 *     tags:
 *       - Transaction
 *     summary: Deposit funds into an account
 *     description: Allows authenticated users to deposit funds into a specified account.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - accountNumber
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 minimum: 0.01
 *                 description: The amount to deposit. Must be a positive number.
 *                 example: 100.50
 *               accountNumber:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *                 description: The 10-digit account number to deposit into.
 *                 example: "1234567890"
 *               narration:
 *                 type: string
 *                 maxLength: 255
 *                 description: Optional description for the deposit.
 *                 example: "Monthly salary deposit"
 *     responses:
 *       200:
 *         description: Deposit successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Deposit successful"
 *                 transaction:
 *                   type: object
 *                   description: Details of the created transaction
 *       400:
 *         description: Bad Request. Invalid input data.
 *       401:
 *         description: Unauthorized. Authentication token is missing or invalid.
 *       500:
 *         description: Internal Server Error.
 */
transactionRoutes.post('/deposit',
  requireAuth,
  validate(transactionValidation.depositSchema),
  transactionsController.depositToAccount
)

/**
 * @swagger
 * /transaction/withdraw:
 *   post:
 *     tags:
 *       - Transaction
 *     summary: Withdraw funds from an account
 *     description: Allows authenticated users to withdraw funds from a specified account.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - accountNumber
 *             properties:
 *               amount:
 *                 type: number
 *                 format: float
 *                 minimum: 0.01
 *                 description: The amount to withdraw. Must be a positive number.
 *                 example: 50.00
 *               accountNumber:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *                 description: The 10-digit account number to withdraw from.
 *                 example: "0987654321"
 *               narration:
 *                 type: string
 *                 maxLength: 255
 *                 description: Optional description for the withdrawal.
 *                 example: "Cash withdrawal for groceries"
 *     responses:
 *       200:
 *         description: Withdrawal successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Withdrawal successful"
 *                 transaction:
 *                   type: object
 *                   description: Details of the created transaction
 *       400:
 *         description: Bad Request. Invalid input data or insufficient funds.
 *       401:
 *         description: Unauthorized. Authentication token is missing or invalid.
 *       500:
 *         description: Internal Server Error.
 */
transactionRoutes.post('/withdraw',
  requireAuth,
  validate(transactionValidation.withdrawalSchema),
  transactionsController.withdrawFromAccount
)

/**
 * @swagger
 * /transaction/transfer:
 *   post:
 *     tags:
 *       - Transaction
 *     summary: Transfer funds between accounts
 *     description: Allows authenticated users to transfer funds from one account to another.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromAccountNumber
 *               - toAccountNumber
 *               - amount
 *             properties:
 *               fromAccountNumber:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *                 description: The 10-digit account number to transfer funds from.
 *                 example: "1234567890"
 *               toAccountNumber:
 *                 type: string
 *                 pattern: '^\d{10}$'
 *                 description: The 10-digit account number to transfer funds to.
 *                 example: "0987654321"
 *               amount:
 *                 type: number
 *                 format: float
 *                 minimum: 0.01
 *                 description: The amount to transfer. Must be a positive number.
 *                 example: 75.00
 *               narration:
 *                 type: string
 *                 maxLength: 255
 *                 description: Optional description for the transfer.
 *                 example: "Monthly rent payment"
 *     responses:
 *       200:
 *         description: Transfer successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Transfer successful"
 *                 transaction:
 *                   type: object
 *                   description: Details of the created transaction
 *       400:
 *         description: Bad Request. Invalid input data, insufficient funds, or same source/destination account.
 *       401:
 *         description: Unauthorized. Authentication token is missing or invalid.
 *       500:
 *         description: Internal Server Error.
 */
transactionRoutes.post('/transfer',
  requireAuth,
  validate(transactionValidation.transferSchema),
  transactionsController.transferBetweenAccounts
)


/**
 * @swagger
 * /transaction/account/{accountNumber}:
 *   get:
 *     tags:
 *       - Transaction
 *     summary: Get transactions for a specific account
 *     description: Allows authenticated users to retrieve a list of transactions for a given account number.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         schema:
 *           type: string
 *           pattern: '^\d{10}$'
 *         required: true
 *         description: The 10-digit account number to retrieve transactions for.
 *         example: "1234567890"
 *     responses:
 *       200:
 *         description: Successfully retrieved transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Transactions retrieved successfully"
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                         example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *                       type:
 *                         type: string
 *                         enum: [deposit, withdrawal, transfer]
 *                         example: "deposit"
 *                       amount:
 *                         type: number
 *                         format: float
 *                         example: 100.50
 *                       narration:
 *                         type: string
 *                         nullable: true
 *                         example: "Monthly salary deposit"
 *                       fromAccount:
 *                         type: string
 *                         nullable: true
 *                         example: "1234567890"
 *                       toAccount:
 *                         type: string
 *                         nullable: true
 *                         example: "1234567890"
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-10-27T10:00:00.000Z"
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2023-10-27T10:00:00.000Z"
 *       400:
 *         description: Bad Request. Invalid account number format.
 *       401:
 *         description: Unauthorized. Authentication token is missing or invalid.
 *       404:
 *         description: Account not found or no transactions found for the account.
 *       500:
 *         description: Internal Server Error.
 */
transactionRoutes.get('/account/:accountNumber',
  requireAuth,
  transactionsController.getTransactions
)

/**
 * @swagger
 * /transaction/{id}:
 *   get:
 *     tags:
 *       - Transaction
 *     summary: Get a transaction by ID
 *     description: Allows authenticated users to retrieve details of a specific transaction by its unique ID.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: The unique identifier (UUID) of the transaction.
 *         example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *     responses:
 *       200:
 *         description: Transaction details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Transaction retrieved successfully"
 *                 transaction:
 *                   type: object
 *                   description: Details of the retrieved transaction
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: "a1b2c3d4-e5f6-7890-1234-567890abcdef"
 *                     type:
 *                       type: string
 *                       enum: [deposit, withdrawal, transfer]
 *                       example: "deposit"
 *                     amount:
 *                       type: number
 *                       format: float
 *                       example: 100.50
 *                     narration:
 *                       type: string
 *                       nullable: true
 *                       example: "Monthly salary deposit"
 *                     fromAccount:
 *                       type: string
 *                       nullable: true
 *                       example: "1234567890"
 *                     toAccount:
 *                       type: string
 *                       nullable: true
 *                       example: "0987654321"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-10-27T10:00:00.000Z"
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2023-10-27T10:00:00.000Z"
 *       400:
 *         description: Bad Request. Invalid transaction ID format.
 *       401:
 *         description: Unauthorized. Authentication token is missing or invalid.
 *       404:
 *         description: Transaction not found.
 *       500:
 *         description: Internal Server Error.
 */
transactionRoutes.get('/:id',
  requireAuth,
  transactionsController.getTransactionById
)






export { transactionRoutes };