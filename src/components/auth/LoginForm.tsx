import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { AuthSuccessBanner } from "./AuthSuccessBanner";
import { useAuthApi } from "./hooks/useAuthApi";
import type { LoginCommand } from "@/types";
import type { LoginFormErrors } from "./auth.types";

// ============================================================================
// Validation
// ============================================================================

/**
 * Validates email format
 * Returns error message string if invalid, undefined if valid
 * 
 * Using permissive regex based on HTML5 spec + RFC 5322 simplified
 * Pattern: local-part @ domain . TLD
 * - local-part: alphanumeric + special chars (. _ % + -)
 * - domain: alphanumeric + hyphen and dot
 * - TLD: at least 2 letters
 */
function validateEmail(email: string): string | undefined {
  if (!email) {
    return "Adres e-mail jest wymagany";
  }

  // More permissive regex - matches most valid email formats
  // Anchors (^ $) ensure full string match without need for \b
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    return "Podaj prawidłowy adres e-mail";
  }

  return undefined;
}

/**
 * Validates password field
 * Returns error message string if invalid, undefined if valid
 */
function validatePassword(password: string): string | undefined {
  if (!password) {
    return "Hasło jest wymagane";
  }

  return undefined;
}

/**
 * Validates entire login form
 * Returns object with field errors, or empty object if valid
 * Using undefined for "no error" is consistent with:
 * - TypeScript optional types (string | undefined)
 * - React form patterns
 * - Clear semantic: undefined = absence of error
 */
function validateForm(values: LoginCommand): LoginFormErrors {
  const errors: LoginFormErrors = {};

  const emailError = validateEmail(values.email);
  if (emailError) {
    errors.email = emailError;
  }

  const passwordError = validatePassword(values.password);
  if (passwordError) {
    errors.password = passwordError;
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

interface LoginFormProps {
  showEmailConfirmed?: boolean;
}

export function LoginForm({ showEmailConfirmed = false }: LoginFormProps) {
  const { login, isLoading, error: apiError, clearError } = useAuthApi();

  const [values, setValues] = useState<LoginCommand>({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [touched, setTouched] = useState<Record<keyof LoginCommand, boolean>>({
    email: false,
    password: false,
  });
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [showSuccess, setShowSuccess] = useState<boolean>(showEmailConfirmed);

  // Clear submit error when API error changes
  useEffect(() => {
    if (apiError) {
      setSubmitError(apiError.message);
    }
  }, [apiError]);

  const handleChange = useCallback((field: keyof LoginCommand) => {
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

      // Clear submit error on any change
      if (submitError) {
        setSubmitError(undefined);
        clearError();
      }
    };
  }, [errors, submitError, clearError]);

  const handleBlur = useCallback((field: keyof LoginCommand) => {
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
      }
    };
  }, [values]);

  const handleSubmit = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ email: true, password: true });

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

    // Call API
    const result = await login(values);

    if (result) {
      // Success - redirect to main panel
      window.location.href = "/";
    }
    // Error is handled by useEffect watching apiError
  }, [values, login, clearError]);

  const showFieldError = (field: keyof LoginCommand): boolean => {
    return touched[field] && !!errors[field];
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit} noValidate>
      {/* Success banner */}
      {showSuccess && (
        <AuthSuccessBanner
          message="Potwierdzono adres email"
          onDismiss={() => setShowSuccess(false)}
        />
      )}

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
        <Label htmlFor="password">Hasło</Label>
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

      {/* Submit button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isLoading}
      >
        {isLoading ? "Logowanie..." : "Zaloguj się"}
      </Button>

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

