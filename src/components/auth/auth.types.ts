/**
 * Local types for auth forms - UI-specific types
 * 
 * For API types (Commands, DTOs), use @/types.ts
 * This file contains ONLY types that don't exist in API:
 * - FormErrors (client-side validation)
 * - FormValues only when they differ from API Commands (e.g., camelCase vs snake_case)
 */

// ============================================================================
// Form Values (only when different from API Commands)
// ============================================================================

/**
 * Register form values - uses camelCase (React convention)
 * Maps to RegisterCommand with snake_case before sending to API
 */
export interface RegisterFormValues {
  email: string;
  password: string;
  passwordConfirmation: string; // camelCase - maps to password_confirmation in API
}

/**
 * Reset password form values - uses camelCase (React convention)
 * Maps to ResetPasswordCommand with snake_case before sending to API
 */
export interface ResetPasswordFormValues {
  newPassword: string; // camelCase - maps to new_password in API
  newPasswordConfirmation: string; // camelCase - maps to new_password_confirmation in API
}

// Note: LoginFormValues and ForgotPasswordFormValues are identical to their Commands,
// so we use LoginCommand and ForgotPasswordCommand directly from @/types.ts

// ============================================================================
// Form Errors (client-side validation - not in API)
// ============================================================================

export interface LoginFormErrors {
  email?: string;
  password?: string;
}

export interface RegisterFormErrors {
  email?: string;
  password?: string;
  passwordConfirmation?: string;
}

export interface ForgotPasswordFormErrors {
  email?: string;
}

export interface ResetPasswordFormErrors {
  newPassword?: string;
  newPasswordConfirmation?: string;
}
