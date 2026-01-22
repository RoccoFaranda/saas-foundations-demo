import { z } from "zod";

/**
 * Password requirements:
 * - Minimum 8 characters
 * - Maximum 128 characters
 */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

/**
 * Email validation
 * Note: trim happens before validation via preprocess
 */
export const emailSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toLowerCase().trim() : val),
  z
    .email({ message: "Please enter a valid email address" })
    .max(255, "Email must be at most 255 characters")
);

/**
 * Signup form schema
 */
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export type SignupInput = z.input<typeof signupSchema>;
export type SignupOutput = z.output<typeof signupSchema>;

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.input<typeof loginSchema>;
export type LoginOutput = z.output<typeof loginSchema>;

/**
 * Change password form schema
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

export type ChangePasswordInput = z.input<typeof changePasswordSchema>;
export type ChangePasswordOutput = z.output<typeof changePasswordSchema>;

/**
 * Change email form schema
 */
export const changeEmailSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newEmail: emailSchema,
});

export type ChangeEmailInput = z.input<typeof changeEmailSchema>;
export type ChangeEmailOutput = z.output<typeof changeEmailSchema>;
