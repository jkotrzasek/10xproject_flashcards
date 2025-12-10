import { useState, useCallback } from "react";
import type { LoginCommand, RegisterCommand, AuthResponseDto, AuthErrorDto } from "@/types";

// ============================================================================
// Hook
// ============================================================================

export function useAuthApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthErrorDto | null>(null);

  const login = useCallback(async (credentials: LoginCommand): Promise<AuthResponseDto | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          code: "UNKNOWN_ERROR",
          message: "Wystąpił nieznany błąd",
        }));

        setError(errorData);
        return null;
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const networkError: AuthErrorDto = {
        code: "NETWORK_ERROR",
        message: "Nie udało się połączyć z serwerem. Sprawdź połączenie internetowe.",
      };
      setError(networkError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterCommand): Promise<AuthResponseDto | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          code: "UNKNOWN_ERROR",
          message: "Wystąpił nieznany błąd",
        }));

        setError(errorData);
        return null;
      }

      const responseData = await response.json();
      return responseData;
    } catch (err) {
      const networkError: AuthErrorDto = {
        code: "NETWORK_ERROR",
        message: "Nie udało się połączyć z serwerem. Sprawdź połączenie internetowe.",
      };
      setError(networkError);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          code: "UNKNOWN_ERROR",
          message: "Wystąpił błąd podczas wylogowania",
        }));

        setError(errorData);
        return false;
      }

      return true;
    } catch (err) {
      const networkError: AuthErrorDto = {
        code: "NETWORK_ERROR",
        message: "Nie udało się połączyć z serwerem.",
      };
      setError(networkError);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // const requestPasswordReset = useCallback(async (data: ForgotPasswordCommand): Promise<boolean> => {
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     const response = await fetch("/api/auth/forgot-password", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(data),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({
  //         code: "UNKNOWN_ERROR",
  //         message: "Wystąpił nieznany błąd",
  //       }));

  //       setError(errorData);
  //       return false;
  //     }

  //     return true;
  //   } catch (err) {
  //     const networkError: AuthErrorDto = {
  //       code: "NETWORK_ERROR",
  //       message: "Nie udało się połączyć z serwerem.",
  //     };
  //     setError(networkError);
  //     return false;
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);

  // const resetPassword = useCallback(async (data: ResetPasswordCommand): Promise<boolean> => {
  //   setIsLoading(true);
  //   setError(null);

  //   try {
  //     const response = await fetch("/api/auth/reset-password", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(data),
  //     });

  //     if (!response.ok) {
  //       const errorData = await response.json().catch(() => ({
  //         code: "UNKNOWN_ERROR",
  //         message: "Wystąpił nieznany błąd",
  //       }));

  //       setError(errorData);
  //       return false;
  //     }

  //     return true;
  //   } catch (err) {
  //     const networkError: AuthErrorDto = {
  //       code: "NETWORK_ERROR",
  //       message: "Nie udało się połączyć z serwerem.",
  //     };
  //     setError(networkError);
  //     return false;
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    login,
    register,
    logout,
    // requestPasswordReset,
    // resetPassword,
    isLoading,
    error,
    clearError,
  };
}
