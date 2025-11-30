import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { ApiErrorResponse } from "../../../types";

// ============================================================================
// Types
// ============================================================================

interface ResetProgressResult {
  success: boolean;
  error?: string;
}

interface UseDeckMutationsReturn {
  resetProgress: () => Promise<ResetProgressResult>;
  isResettingProgress: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook do mutacji na poziomie decku
 * - resetProgress: POST /api/decks/:id/reset-progress
 */
export function useDeckMutations(
  deckId: number,
  options?: {
    onResetSuccess?: () => void;
  }
): UseDeckMutationsReturn {
  const [isResettingProgress, setIsResettingProgress] = useState(false);

  // ============================================================================
  // Reset Progress
  // ============================================================================

  const resetProgress = useCallback(async (): Promise<ResetProgressResult> => {
    setIsResettingProgress(true);

    try {
      const response = await fetch(`/api/decks/${deckId}/reset-progress`, {
        method: "POST",
      });

      if (!response.ok) {
        if (response.status !== 204) {
          const errorData: ApiErrorResponse = await response.json();
          const errorMessage = errorData.error.message || "Nie udało się zresetować postępu";

          // 404 - Deck not found
          if (response.status === 404) {
            toast.error("Deck nie istnieje lub został usunięty");
            setIsResettingProgress(false);
            return { success: false, error: "DECK_NOT_FOUND" };
          }

          // 500 - Server error
          toast.error("Nie udało się zresetować postępu. Spróbuj ponownie później.");
          setIsResettingProgress(false);
          return { success: false, error: errorMessage };
        }
      }

      // Success - 204 No Content
      toast.success("Postęp nauki w decku został zresetowany");
      setIsResettingProgress(false);
      
      // Call optional success callback (e.g., to refetch flashcards)
      if (options?.onResetSuccess) {
        options.onResetSuccess();
      }
      
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Błąd połączenia z serwerem";
      toast.error("Problem z połączeniem. Sprawdź internet i spróbuj ponownie.");
      setIsResettingProgress(false);
      return { success: false, error: errorMessage };
    }
  }, [deckId, options]);

  return {
    resetProgress,
    isResettingProgress,
  };
}

