import { useCallback } from "react";
import { toast } from "sonner";
import type { ApiErrorResponse } from "../../../types";

// ============================================================================
// Types
// ============================================================================

interface UseDeleteFlashcardReturn {
  deleteFlashcard: (flashcardId: number) => Promise<{ success: boolean; error?: string }>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook do usuwania fiszki
 * Wykonuje DELETE /api/flashcards/:id
 */
export function useDeleteFlashcard(): UseDeleteFlashcardReturn {
  const deleteFlashcard = useCallback(async (flashcardId: number) => {
    try {
      const response = await fetch(`/api/flashcards/${flashcardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // Parse error response (except for 204)
        if (response.status !== 204) {
          const errorData: ApiErrorResponse = await response.json();
          const errorMessage = errorData.error.message || "Nie udało się usunąć fiszki";
          const errorCode = errorData.error.code;

          // Handle specific errors
          if (response.status === 404) {
            toast.error("Fiszka nie została znaleziona");
            return { success: false, error: errorMessage };
          }

          if (response.status === 400) {
            toast.error("Nieprawidłowe dane");
            return { success: false, error: errorMessage };
          }

          // Generic server error
          toast.error("Nie udało się usunąć fiszki. Spróbuj ponownie później.");
          return { success: false, error: errorMessage };
        }
      }

      // Success - 204 No Content
      toast.success("Fiszka została usunięta");
      return { success: true };
    } catch (err) {
      // Network error
      const errorMessage = err instanceof Error ? err.message : "Błąd połączenia z serwerem";
      toast.error("Problem z połączeniem. Sprawdź internet i spróbuj ponownie.");
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    deleteFlashcard,
  };
}
