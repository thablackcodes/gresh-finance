import z from "zod";


const depositSchema = z.object({
  amount: z.number({
    message: "Amount must be a number.",
  }).positive("Amount must be a positive number."),
  accountNumber: z.string({
    message: "Account number must be a string.",
  }).length(10, "Account number must be exactly 10 characters long."),
  narration: z.string({
    message: "Narration must be a string.",
  }).max(255, "Narration cannot exceed 255 characters.").optional(),
});


const withdrawalSchema = z.object({
  amount: z.number({
    message: "Amount must be a number.",
  }).positive("Amount must be a positive number."),
  accountNumber: z.string({
    message: "Account number must be a string.",
  }).length(10, "Account number must be exactly 10 characters long."),
  narration: z.string({
    message: "Narration must be a string.",
  }).max(255, "Narration cannot exceed 255 characters.").optional(),
});



const transferSchema = z.object({
  fromAccountNumber: z
    .string()
    .length(10, "Sender account number must be 10 digits"),
  toAccountNumber: z
    .string()
    .length(10, "Recipient account number must be 10 digits"),
  amount: z
    .number()
    .positive("Transfer amount must be greater than zero"),
  narration: z.string({
    message: "Narration must be a string.",
  }).max(255, "Narration cannot exceed 255 characters.").optional(),
});

export const transactionValidation = {
  depositSchema,
  withdrawalSchema,
  transferSchema
};