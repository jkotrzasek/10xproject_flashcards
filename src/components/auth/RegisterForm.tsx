import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, CheckCircle2 } from "lucide-react";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { useAuthApi } from "./hooks/useAuthApi";
import type { RegisterFormValues, RegisterFormErrors } from "./auth.types";

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates email format
 * Returns error message string if invalid, undefined if valid
 */
function validateEmail(email: string): string | undefined {
  if (!email) {
    return "Adres e-mail jest wymagany";
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return "Podaj prawidłowy adres e-mail";
  }

  return undefined;
}

/**
 * Validates password field with strength requirements
 * Returns error message string if invalid, undefined if valid
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one special character
 */
function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Hasło jest wymagane";
  }

  if (password.length < 8) {
    return "Hasło musi mieć minimum 8 znaków";
  }

  if (!/\p{Ll}/u.test(password)) {
    return "Hasło musi zawierać co najmniej jedną małą literę";
  }

  if (!/\p{Lu}/u.test(password)) {
    return "Hasło musi zawierać co najmniej jedną dużą literę";
  }

  if (!/[!@#$%^&*()_+=[\]{};':"\\|,.<>/?-]/.test(password)) {
    return "Hasło musi zawierać co najmniej jeden znak specjalny";
  }

  return undefined;
}

/**
 * Validates password confirmation field
 * Returns error message string if invalid, undefined if valid
 */
function validatePasswordConfirmation(password: string, passwordConfirmation: string): string | undefined {
  if (!passwordConfirmation) {
    return "Potwierdzenie hasła jest wymagane";
  }

  if (password !== passwordConfirmation) {
    return "Hasła nie są identyczne";
  }

  return undefined;
}

/**
 * Validates entire registration form
 * Returns object with field errors, or empty object if valid
 */
function validateForm(values: RegisterFormValues): RegisterFormErrors {
  const errors: RegisterFormErrors = {};

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  const passwordConfirmationError = validatePasswordConfirmation(values.password, values.passwordConfirmation);
  if (passwordConfirmationError) {
    errors.passwordConfirmation = passwordConfirmationError;
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

export function RegisterForm() {
  const { register, isLoading, error: apiError, clearError } = useAuthApi();

  const [values, setValues] = useState<RegisterFormValues>({
    email: "",
    password: "",
    passwordConfirmation: "",
  });

  const [errors, setErrors] = useState<RegisterFormErrors>({});
  const [touched, setTouched] = useState<Record<keyof RegisterFormValues, boolean>>({
    email: false,
    password: false,
    passwordConfirmation: false,
  });
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Clear submit error when API error changes
  useEffect(() => {
    if (apiError) {
      // Check for specific error codes
      if (apiError.code === "EMAIL_ALREADY_REGISTERED") {
        setSubmitError("Konto z tym adresem e-mail już istnieje");
      } else {
        setSubmitError(apiError.message);
      }
    }
  }, [apiError]);

  const handleChange = useCallback(
    (field: keyof RegisterFormValues) => {
      return (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValues((prev) => ({ ...prev, [field]: newValue }));

        // Clear field error on change
        if (errors[field]) {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        }

        // Clear submit error on any change
        if (submitError) {
          setSubmitError(undefined);
          clearError();
        }

        // Special case: clear passwordConfirmation error when password changes
        if (field === "password" && errors.passwordConfirmation) {
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.passwordConfirmation;
            return newErrors;
          });
        }
      };
    },
    [errors, submitError, clearError]
  );

  const handleBlur = useCallback(
    (field: keyof RegisterFormValues) => {
      return () => {
        setTouched((prev) => ({ ...prev, [field]: true }));

        // Validate on blur
        if (field === "email") {
          const emailError = validateEmail(values.email);
          if (emailError) {
            setErrors((prev) => ({ ...prev, email: emailError }));
          }
        } else if (field === "password") {
          const passwordError = validatePassword(values.password);
          if (passwordError) {
            setErrors((prev) => ({ ...prev, password: passwordError }));
          }
          // Also revalidate confirmation if it's been touched
          if (touched.passwordConfirmation && values.passwordConfirmation) {
            const confirmError = validatePasswordConfirmation(values.password, values.passwordConfirmation);
            if (confirmError) {
              setErrors((prev) => ({ ...prev, passwordConfirmation: confirmError }));
            } else {
              setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors.passwordConfirmation;
                return newErrors;
              });
            }
          }
        } else if (field === "passwordConfirmation") {
          const confirmError = validatePasswordConfirmation(values.password, values.passwordConfirmation);
          if (confirmError) {
            setErrors((prev) => ({ ...prev, passwordConfirmation: confirmError }));
          }
        }
      };
    },
    [values, touched]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Mark all fields as touched
      setTouched({
        email: true,
        password: true,
        passwordConfirmation: true,
      });

      // Validate
      const validationErrors = validateForm(values);
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Clear previous errors
      setErrors({});
      setSubmitError(undefined);
      clearError();

      // Map camelCase to snake_case for API
      const result = await register({
        email: values.email,
        password: values.password,
        password_confirmation: values.passwordConfirmation,
      });

      if (result) {
        // Success - show confirmation message
        // User must confirm email before logging in
        setRegistrationSuccess(true);
      }
      // Error is handled by useEffect watching apiError
    },
    [values, register, clearError]
  );

  const showFieldError = (field: keyof RegisterFormValues): boolean => {
    return touched[field] && !!errors[field];
  };

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="space-y-6">
        {/* Success message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-semibold text-green-900">Konto utworzone pomyślnie!</h3>
              <p className="text-sm text-green-800">
                Na adres <strong>{values.email}</strong> został wysłany link aktywacyjny. Kliknij w link w wiadomości,
                aby aktywować konto i móc się zalogować.
              </p>
              <p className="text-sm text-green-800">Jeśli nie widzisz wiadomości, sprawdź folder spam.</p>
            </div>
          </div>
        </div>

        {/* Login link */}
        <div className="text-center">
          <a href="/auth/login" className="text-primary hover:underline font-medium transition-colors">
            Przejdź do logowania
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {/* Global error banner */}
      {submitError && (
        <AuthErrorBanner
          message={submitError}
          onDismiss={() => {
            setSubmitError(undefined);
            clearError();
          }}
        />
      )}

      {/* Email field */}
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          placeholder="twoj@email.com"
          value={values.email}
          onChange={handleChange("email")}
          onBlur={handleBlur("email")}
          aria-invalid={showFieldError("email")}
          aria-describedby={showFieldError("email") ? "email-error" : undefined}
          disabled={isLoading}
          autoComplete="email"
        />
        {showFieldError("email") && (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Hasło</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <InfoIcon className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px]">
                <p className="text-xs">
                  Hasło musi zawierać:
                  <br />
                  • minimum 8 znaków
                  <br />
                  • co najmniej jedną dużą literę
                  <br />
                  • co najmniej jedną małą literę
                  <br />• co najmniej jeden znak specjalny
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={values.password}
          onChange={handleChange("password")}
          onBlur={handleBlur("password")}
          aria-invalid={showFieldError("password")}
          aria-describedby={showFieldError("password") ? "password-error" : undefined}
          disabled={isLoading}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
        />
        {showFieldError("password") && (
          <p id="password-error" className="text-sm text-destructive" role="alert">
            {errors.password}
          </p>
        )}
      </div>

      {/* Password confirmation field */}
      <div className="space-y-2">
        <Label htmlFor="passwordConfirmation">Potwierdź hasło</Label>
        <Input
          id="passwordConfirmation"
          type="password"
          placeholder="••••••••"
          value={values.passwordConfirmation}
          onChange={handleChange("passwordConfirmation")}
          onBlur={handleBlur("passwordConfirmation")}
          aria-invalid={showFieldError("passwordConfirmation")}
          aria-describedby={showFieldError("passwordConfirmation") ? "password-confirmation-error" : undefined}
          disabled={isLoading}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
        />
        {showFieldError("passwordConfirmation") && (
          <p id="password-confirmation-error" className="text-sm text-destructive" role="alert">
            {errors.passwordConfirmation}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Rejestracja..." : "Zarejestruj się"}
      </Button>

      {/* Login link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Masz już konto?{" "}
          <a href="/auth/login" className="text-primary hover:underline font-medium transition-colors">
            Zaloguj się
          </a>
        </p>
      </div>
    </form>
  );
}
