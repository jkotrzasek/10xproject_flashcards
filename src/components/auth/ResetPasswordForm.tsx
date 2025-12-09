import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { InfoIcon, CheckCircle2 } from "lucide-react";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { useAuthApi } from "./hooks/useAuthApi";
import type { ResetPasswordFormValues, ResetPasswordFormErrors } from "./auth.types";

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates password field with strength requirements
 * Returns error message string if invalid, undefined if valid
 */
function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Hasło jest wymagane";
  }

  if (password.length < 8) {
    return "Hasło musi mieć minimum 8 znaków";
  }

  if (!/[A-Z]/.test(password)) {
    return "Hasło musi zawierać co najmniej jedną dużą literę";
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Hasło musi zawierać co najmniej jeden znak specjalny";
  }

  return undefined;
}

/**
 * Validates password confirmation field
 * Returns error message string if invalid, undefined if valid
 */
function validatePasswordConfirmation(
  password: string,
  passwordConfirmation: string
): string | undefined {
  if (!passwordConfirmation) {
    return "Potwierdzenie hasła jest wymagane";
  }

  if (password !== passwordConfirmation) {
    return "Hasła nie są identyczne";
  }

  return undefined;
}

/**
 * Validates entire reset password form
 * Returns object with field errors, or empty object if valid
 */
function validateForm(values: ResetPasswordFormValues): ResetPasswordFormErrors {
  const errors: ResetPasswordFormErrors = {};

  const passwordError = validatePassword(values.newPassword);
  if (passwordError) {
    errors.newPassword = passwordError;
  }

  const passwordConfirmationError = validatePasswordConfirmation(
    values.newPassword,
    values.newPasswordConfirmation
  );
  if (passwordConfirmationError) {
    errors.newPasswordConfirmation = passwordConfirmationError;
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

interface ResetPasswordFormProps {
  token?: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const { resetPassword, isLoading, error: apiError, clearError } = useAuthApi();

  const [values, setValues] = useState<ResetPasswordFormValues>({
    newPassword: "",
    newPasswordConfirmation: "",
  });

  const [errors, setErrors] = useState<ResetPasswordFormErrors>({});
  const [touched, setTouched] = useState<Record<keyof ResetPasswordFormValues, boolean>>({
    newPassword: false,
    newPasswordConfirmation: false,
  });
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [successMessage, setSuccessMessage] = useState<string | undefined>();

  // Clear submit error when API error changes
  useEffect(() => {
    if (apiError) {
      // Check for specific error codes
      if (apiError.code === "RESET_TOKEN_INVALID_OR_EXPIRED") {
        setSubmitError("Link do resetowania hasła wygasł lub jest nieprawidłowy. Spróbuj ponownie.");
      } else {
        setSubmitError(apiError.message);
      }
    }
  }, [apiError]);

  const handleChange = useCallback((field: keyof ResetPasswordFormValues) => {
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

      // Special case: clear newPasswordConfirmation error when newPassword changes
      if (field === "newPassword" && errors.newPasswordConfirmation) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.newPasswordConfirmation;
          return newErrors;
        });
      }
    };
  }, [errors, submitError, successMessage, clearError]);

  const handleBlur = useCallback((field: keyof ResetPasswordFormValues) => {
    return () => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Validate on blur
      if (field === "newPassword") {
        const passwordError = validatePassword(values.newPassword);
        if (passwordError) {
          setErrors((prev) => ({ ...prev, newPassword: passwordError }));
        }
        // Also revalidate confirmation if it's been touched
        if (touched.newPasswordConfirmation && values.newPasswordConfirmation) {
          const confirmError = validatePasswordConfirmation(
            values.newPassword,
            values.newPasswordConfirmation
          );
          if (confirmError) {
            setErrors((prev) => ({ ...prev, newPasswordConfirmation: confirmError }));
          } else {
            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors.newPasswordConfirmation;
              return newErrors;
            });
          }
        }
      } else if (field === "newPasswordConfirmation") {
        const confirmError = validatePasswordConfirmation(
          values.newPassword,
          values.newPasswordConfirmation
        );
        if (confirmError) {
          setErrors((prev) => ({ ...prev, newPasswordConfirmation: confirmError }));
        }
      }
    };
  }, [values, touched]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      newPassword: true,
      newPasswordConfirmation: true,
    });

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

    // Map camelCase to snake_case for API
    const result = await resetPassword({
      new_password: values.newPassword,
      new_password_confirmation: values.newPasswordConfirmation,
      token: token,
    });

    if (result) {
      // Success - show success message
      setSuccessMessage("Hasło zostało zmienione pomyślnie!");
      // Clear form
      setValues({
        newPassword: "",
        newPasswordConfirmation: "",
      });
      setTouched({
        newPassword: false,
        newPasswordConfirmation: false,
      });
    }
    // Error is handled by useEffect watching apiError
  }, [values, token, resetPassword, clearError]);

  const showFieldError = (field: keyof ResetPasswordFormValues): boolean => {
    return touched[field] && !!errors[field];
  };

  // Check if there's no token
  const hasNoToken = !token;

  if (hasNoToken) {
    return (
      <div className="space-y-6">
        <AuthErrorBanner
          message="Brak tokenu resetowania hasła. Link może być nieprawidłowy lub uszkodzony."
        />
        <div className="text-center">
          <a
            href="/auth/forgot-password"
            className="text-sm text-primary hover:underline transition-colors"
          >
            Wróć do formularza odzyskiwania hasła
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {/* Success message */}
      {successMessage && (
        <div
          className="flex items-start gap-3 rounded-md bg-primary/10 border border-primary/20 p-4"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-foreground font-medium mb-2">
              {successMessage}
            </p>
            <a
              href="/auth/login"
              className="text-sm text-primary hover:underline font-medium transition-colors"
            >
              Przejdź do logowania →
            </a>
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

      {/* New Password field */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="newPassword">Nowe hasło</Label>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                <InfoIcon className="h-4 w-4" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[200px]">
                <p className="text-xs">
                  Hasło musi zawierać:<br />
                  • minimum 8 znaków<br />
                  • co najmniej jedną dużą literę<br />
                  • co najmniej jeden znak specjalny
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Input
          id="newPassword"
          type="password"
          placeholder="••••••••"
          value={values.newPassword}
          onChange={handleChange("newPassword")}
          onBlur={handleBlur("newPassword")}
          aria-invalid={showFieldError("newPassword")}
          aria-describedby={showFieldError("newPassword") ? "new-password-error" : undefined}
          disabled={isLoading}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
        />
        {showFieldError("newPassword") && (
          <p id="new-password-error" className="text-sm text-destructive" role="alert">
            {errors.newPassword}
          </p>
        )}
      </div>

      {/* New Password confirmation field */}
      <div className="space-y-2">
        <Label htmlFor="newPasswordConfirmation">Potwierdź nowe hasło</Label>
        <Input
          id="newPasswordConfirmation"
          type="password"
          placeholder="••••••••"
          value={values.newPasswordConfirmation}
          onChange={handleChange("newPasswordConfirmation")}
          onBlur={handleBlur("newPasswordConfirmation")}
          aria-invalid={showFieldError("newPasswordConfirmation")}
          aria-describedby={showFieldError("newPasswordConfirmation") ? "new-password-confirmation-error" : undefined}
          disabled={isLoading}
          autoComplete="off"
          data-lpignore="true"
          data-form-type="other"
        />
        {showFieldError("newPasswordConfirmation") && (
          <p id="new-password-confirmation-error" className="text-sm text-destructive" role="alert">
            {errors.newPasswordConfirmation}
          </p>
        )}
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading || !!successMessage}
      >
        {isLoading ? "Zmiana hasła..." : "Zmień hasło"}
      </Button>

      {/* Back to login link */}
      {!successMessage && (
        <div className="text-center">
          <a
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Wróć do logowania
          </a>
        </div>
      )}
    </form>
  );
}
