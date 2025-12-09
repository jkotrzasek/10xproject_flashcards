import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { useAuthApi } from "./hooks/useAuthApi";
import type { ForgotPasswordCommand } from "@/types";
import type { ForgotPasswordFormErrors } from "./auth.types";

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
 * Validates entire forgot password form
 * Returns object with field errors, or empty object if valid
 */
function validateForm(values: ForgotPasswordCommand): ForgotPasswordFormErrors {
  const errors: ForgotPasswordFormErrors = {};

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

export function ForgotPasswordForm() {
  const { requestPasswordReset, isLoading, error: apiError, clearError } = useAuthApi();

  const [values, setValues] = useState<ForgotPasswordCommand>({
    email: "",
  });

  const [errors, setErrors] = useState<ForgotPasswordFormErrors>({});
  const [touched, setTouched] = useState<Record<keyof ForgotPasswordCommand, boolean>>({
    email: false,
  });
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  // Clear submit error when API error changes
  useEffect(() => {
    if (apiError) {
      setSubmitError(apiError.message);
    }
  }, [apiError]);

  const handleChange = useCallback((field: keyof ForgotPasswordCommand) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setValues((prev) => ({ ...prev, [field]: newValue }));

      // Clear field error on change
      if (errors[field]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }

      // Clear submit error and success message on any change
      if (submitError) {
        setSubmitError(undefined);
        clearError();
      }
      if (successMessage) {
        setSuccessMessage(undefined);
      }
    };
  }, [errors, submitError, successMessage, clearError]);

  const handleBlur = useCallback((field: keyof ForgotPasswordCommand) => {
    return () => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Validate on blur
      if (field === "email") {
        const emailError = validateEmail(values.email);
        if (emailError) {
          setErrors((prev) => ({ ...prev, email: emailError }));
        }
      }
    };
  }, [values]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true });

    // Validate
    const validationErrors = validateForm(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Clear previous errors and success
    setErrors({});
    setSubmitError(undefined);
    setSuccessMessage(undefined);
    clearError();

    // Call API
    const result = await requestPasswordReset(values);

    if (result) {
      // Success - show neutral message (security: don't reveal if email exists)
      setSuccessMessage(
        "Jeśli podany adres istnieje w systemie, wysłaliśmy na niego instrukcję resetowania hasła. Sprawdź swoją skrzynkę e-mail."
      );
      // Clear form
      setValues({ email: "" });
      setTouched({ email: false });
    }
    // Error is handled by useEffect watching apiError
  }, [values, requestPasswordReset, clearError]);

  const showFieldError = (field: keyof ForgotPasswordCommand): boolean => {
    return touched[field] && !!errors[field];
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {/* Success message */}
      {successMessage && (
        <div
          className="flex items-start gap-3 rounded-md bg-primary/10 border border-primary/20 p-4"
          role="status"
          aria-live="polite"
        >
          <svg
            className="h-5 w-5 text-primary shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-1 text-sm text-foreground">
            {successMessage}
          </div>
        </div>
      )}

      {/* Error banner */}
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
          aria-describedby={showFieldError("email") ? "email-error" : "email-hint"}
          disabled={isLoading}
          autoComplete="email"
        />
        {showFieldError("email") ? (
          <p id="email-error" className="text-sm text-destructive" role="alert">
            {errors.email}
          </p>
        ) : (
          <p id="email-hint" className="text-xs text-muted-foreground">
            Podaj adres e-mail użyty przy rejestracji
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Wysyłanie..." : "Wyślij link do resetowania hasła"}
      </Button>

      {/* Back to login link */}
      <div className="text-center">
        <a
          href="/auth/login"
          className="text-sm text-primary hover:underline transition-colors"
        >
          Wróć do logowania
        </a>
      </div>

      {/* Register link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <a
            href="/auth/register"
            className="text-primary hover:underline font-medium transition-colors"
          >
            Zarejestruj się
          </a>
        </p>
      </div>
    </form>
  );
}
