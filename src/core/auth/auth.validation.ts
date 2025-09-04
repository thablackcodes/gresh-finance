import z from "zod";


const passwordValidation = z
  .string()
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character",
  );




const createUserSchema = z
  .object({
    firstName:z.string().min(1,"first name is required"),
    lastName:z.string().min(1,"last name is required"),
    email: z.email("Invalid email address").toLowerCase(),
    password: passwordValidation,
    confirmPassword: passwordValidation,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });


const loginSchema = z.object({
  email: z.email("Invalid email address").toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters long"),
});


export const authValidation = {
  createUserSchema,
  loginSchema
}