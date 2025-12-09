import { AuthError } from "@supabase/supabase-js";
import type { AuthErrorDto } from "@/types";

/**
 * Authentication error codes used across the application
 * These codes map Supabase errors to application-specific error codes
 */
export const AuthErrorCodes = {
  // Authentication errors
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_NOT_CONFIRMED: "EMAIL_NOT_CONFIRMED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  
  // Registration errors
  EMAIL_ALREADY_REGISTERED: "EMAIL_ALREADY_REGISTERED",
  
  // Password reset errors
  RESET_TOKEN_INVALID_OR_EXPIRED: "RESET_TOKEN_INVALID_OR_EXPIRED",
  RESET_TOKEN_MISSING: "RESET_TOKEN_MISSING",
  PASSWORD_SAME_AS_OLD: "PASSWORD_SAME_AS_OLD",
  
  // Session errors
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_SESSION: "INVALID_SESSION",
  
  // Validation errors
  INVALID_EMAIL_FORMAT: "INVALID_EMAIL_FORMAT",
  PASSWORD_TOO_SHORT: "PASSWORD_TOO_SHORT",
  
  // Rate limiting
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  
  // System errors
  DATABASE_ERROR: "DATABASE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
} as const;

/**
 * User-friendly error messages (Polish)
 * Following Google-style minimal disclosure principle
 */
const ERROR_MESSAGES: Record<string, string> = {
  [AuthErrorCodes.INVALID_CREDENTIALS]: "Nieprawidłowy adres e-mail lub hasło",
  [AuthErrorCodes.EMAIL_NOT_CONFIRMED]: "Potwierdź swój adres e-mail, aby się zalogować",
  [AuthErrorCodes.USER_NOT_FOUND]: "Nieprawidłowy adres e-mail lub hasło",
  [AuthErrorCodes.EMAIL_ALREADY_REGISTERED]: "Konto z tym adresem e-mail już istnieje",
  [AuthErrorCodes.RESET_TOKEN_INVALID_OR_EXPIRED]: "Link do resetowania hasła wygasł lub jest nieprawidłowy",
  [AuthErrorCodes.RESET_TOKEN_MISSING]: "Link do resetowania hasła wygasł lub jest nieprawidłowy",
  [AuthErrorCodes.PASSWORD_SAME_AS_OLD]: "Nowe hasło musi być inne niż poprzednie",
  [AuthErrorCodes.SESSION_EXPIRED]: "Twoja sesja wygasła. Zaloguj się ponownie",
  [AuthErrorCodes.INVALID_SESSION]: "Nieprawidłowa sesja. Zaloguj się ponownie",
  [AuthErrorCodes.INVALID_EMAIL_FORMAT]: "Podaj prawidłowy adres e-mail",
  [AuthErrorCodes.PASSWORD_TOO_SHORT]: "Hasło jest wymagane",
  [AuthErrorCodes.TOO_MANY_REQUESTS]: "Zbyt wiele prób. Spróbuj ponownie za chwilę",
  [AuthErrorCodes.DATABASE_ERROR]: "Wystąpił problem z połączeniem. Spróbuj ponownie",
  [AuthErrorCodes.NETWORK_ERROR]: "Nie udało się połączyć z serwerem",
  [AuthErrorCodes.UNKNOWN_ERROR]: "Wystąpił nieoczekiwany błąd. Spróbuj ponownie",
};

/**
 * Maps Supabase AuthError to application-specific AuthErrorDto
 * Implements minimal disclosure principle - user sees only necessary information
 * 
 * @param error - Supabase AuthError or generic Error
 * @returns AuthErrorDto with code and user-friendly message
 */
export function mapSupabaseAuthError(error: unknown): AuthErrorDto {
  // Handle Supabase AuthError
  if (error instanceof AuthError) {
    const supabaseError = error as AuthError;
    
    // Map specific Supabase error messages to our codes
    // Reference: https://supabase.com/docs/reference/javascript/auth-error
    switch (supabaseError.message) {
      case "Invalid login credentials":
      case "Invalid Refresh Token: Already Used":
        return {
          code: AuthErrorCodes.INVALID_CREDENTIALS,
          message: ERROR_MESSAGES[AuthErrorCodes.INVALID_CREDENTIALS],
        };
      
      case "Email not confirmed":
        return {
          code: AuthErrorCodes.EMAIL_NOT_CONFIRMED,
          message: ERROR_MESSAGES[AuthErrorCodes.EMAIL_NOT_CONFIRMED],
        };
      
      case "User not found":
        // Don't reveal user existence - same message as invalid credentials
        return {
          code: AuthErrorCodes.USER_NOT_FOUND,
          message: ERROR_MESSAGES[AuthErrorCodes.INVALID_CREDENTIALS],
        };
      
      case "User already registered":
        return {
          code: AuthErrorCodes.EMAIL_ALREADY_REGISTERED,
          message: ERROR_MESSAGES[AuthErrorCodes.EMAIL_ALREADY_REGISTERED],
        };
      
      default:
        // Check for rate limiting (429)
        if (supabaseError.status === 429) {
          return {
            code: AuthErrorCodes.TOO_MANY_REQUESTS,
            message: ERROR_MESSAGES[AuthErrorCodes.TOO_MANY_REQUESTS],
          };
        }
        
        // Generic auth error - don't expose details
        return {
          code: AuthErrorCodes.UNKNOWN_ERROR,
          message: ERROR_MESSAGES[AuthErrorCodes.UNKNOWN_ERROR],
        };
    }
  }
  
  // Handle generic errors
  if (error instanceof Error) {
    // Network/connection errors
    if (error.message.includes("fetch") || error.message.includes("network")) {
      return {
        code: AuthErrorCodes.NETWORK_ERROR,
        message: ERROR_MESSAGES[AuthErrorCodes.NETWORK_ERROR],
      };
    }
    
    // Database errors
    if (error.message.includes("database") || error.message.includes("PGRST")) {
      return {
        code: AuthErrorCodes.DATABASE_ERROR,
        message: ERROR_MESSAGES[AuthErrorCodes.DATABASE_ERROR],
      };
    }
  }
  
  // Fallback for unknown errors
  return {
    code: AuthErrorCodes.UNKNOWN_ERROR,
    message: ERROR_MESSAGES[AuthErrorCodes.UNKNOWN_ERROR],
  };
}

/**
 * Creates a standard AuthErrorDto with given code
 * Used for validation errors and other non-Supabase errors
 * 
 * @param code - Error code from AuthErrorCodes
 * @returns AuthErrorDto with code and message
 */
export function createAuthError(code: keyof typeof AuthErrorCodes): AuthErrorDto {
  return {
    code,
    message: ERROR_MESSAGES[code] || ERROR_MESSAGES[AuthErrorCodes.UNKNOWN_ERROR],
  };
}

