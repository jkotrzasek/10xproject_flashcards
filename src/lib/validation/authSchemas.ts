import { z } from "zod";

/**
 * Validation schema for login request
 * POST /api/auth/login
 * 
 * Validates:
 * - email: must be valid email format
 * - password: must be non-empty string
 */
export const loginSchema = z.object({
  email: z
    .string({
      required_error: "Adres e-mail jest wymagany",
      invalid_type_error: "Adres e-mail musi być tekstem",
    })
    .email("Podaj prawidłowy adres e-mail")
    .toLowerCase()
    .trim(),
  
  password: z
    .string({
      required_error: "Hasło jest wymagane",
      invalid_type_error: "Hasło musi być tekstem",
    })
    .min(1, "Hasło jest wymagane"),
});

/**
 * Validation schema for registration request
 * POST /api/auth/register
 * 
 * Note: Currently not implemented, defined for future use
 */
export const registerSchema = z
  .object({
    email: z
      .string({
        required_error: "Adres e-mail jest wymagany",
        invalid_type_error: "Adres e-mail musi być tekstem",
      })
      .email("Podaj prawidłowy adres e-mail")
      .toLowerCase()
      .trim(),
    
    password: z
      .string({
        required_error: "Hasło jest wymagane",
        invalid_type_error: "Hasło musi być tekstem",
      })
      .min(8, "Hasło musi mieć co najmniej 8 znaków"),
    
    password_confirmation: z
      .string({
        required_error: "Potwierdzenie hasła jest wymagane",
        invalid_type_error: "Potwierdzenie hasła musi być tekstem",
      })
      .min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Hasła muszą być identyczne",
    path: ["password_confirmation"],
  });

/**
 * Validation schema for forgot password request
 * POST /api/auth/forgot-password
 * 
 * Note: Currently not implemented, defined for future use
 */
export const forgotPasswordSchema = z.object({
  email: z
    .string({
      required_error: "Adres e-mail jest wymagany",
      invalid_type_error: "Adres e-mail musi być tekstem",
    })
    .email("Podaj prawidłowy adres e-mail")
    .toLowerCase()
    .trim(),
});

/**
 * Validation schema for reset password request
 * POST /api/auth/reset-password
 * 
 * Note: Currently not implemented, defined for future use
 */
export const resetPasswordSchema = z
  .object({
    new_password: z
      .string({
        required_error: "Nowe hasło jest wymagane",
        invalid_type_error: "Nowe hasło musi być tekstem",
      })
      .min(8, "Hasło musi mieć co najmniej 8 znaków"),
    
    new_password_confirmation: z
      .string({
        required_error: "Potwierdzenie hasła jest wymagane",
        invalid_type_error: "Potwierdzenie hasła musi być tekstem",
      })
      .min(1, "Potwierdzenie hasła jest wymagane"),
    
    token: z.string().optional(),
  })
  .refine((data) => data.new_password === data.new_password_confirmation, {
    message: "Hasła muszą być identyczne",
    path: ["new_password_confirmation"],
  });

