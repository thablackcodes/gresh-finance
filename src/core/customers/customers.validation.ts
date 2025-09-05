import z from "zod";



const updateCustomerDetailsSchema = z.object({
  accountType: z.enum(["HIDA", "CURRENT"], { message: "account type must be either HIDA or CURRENT" }).optional(),
  status: z.enum(["ACTIVE", "FROZEN", "CLOSED"]).optional(),
}).refine(
  (data) => data.accountType !== undefined || data.status !== undefined,
  "At least one field (accountType or status) must be provided."
);



const createAccountSchema = z.object({
  accountType: z.enum(["SAVINGS", "HIDA", "CURRENT"], { message: "account type must be either SAVINGS,HIDA OR CURRENT" }),
  currency: z.string().optional(),
});


export const customerValidation = {
  updateCustomerDetailsSchema,
  createAccountSchema
};