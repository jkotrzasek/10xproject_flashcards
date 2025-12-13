import { useCallback } from "react";
import { toast } from "sonner";
import type { UpdateFlashcardCommand, ApiErrorResponse } from "../../../types";

// ============================================================================
// Types
// ============================================================================

interface AssignFlashcardPayload {
  flashcardId: number;
  deckId: number;
}

interface UseAssignFlashcardToDeckReturn {
  assign: (payload: AssignFlashcardPayload) => Promise<{ success: boolean; error?: string }>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook do przypisywania fiszki do decku
 * Wykonuje PATCH /api/flashcards/:id z body { deck_id: deckId }
 */
export function useAssignFlashcardToDeck(): UseAssignFlashcardToDeckReturn {
  const assign = useCallback(async ({ flashcardId, deckId }: AssignFlashcardPayload) => {
    try {
      const command: UpdateFlashcardCommand = {
        deck_id: deckId,
      };

      const response = await fetch(`/api/flashcards/${flashcardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        // Parse error response
        const errorData: ApiErrorResponse = await response.json();
        const errorMessage = errorData.error.message || "Nie udało się przypisać fiszki";
        const errorCode = errorData.error.code;

        // Handle specific errors
        if (response.status === 404) {
          if (errorCode === "FLASHCARD_NOT_FOUND") {
            toast.error("Fiszka została usunięta lub nie należy do Ciebie");
            return { success: false, error: errorMessage };
          } else if (errorCode === "DECK_NOT_FOUND") {
            toast.error("Wybrany deck nie istnieje");
            return { success: false, error: errorMessage };
          }
        }

        if (response.status === 400) {
          toast.error("Nieprawidłowe dane");
          return { success: false, error: errorMessage };
        }

        // Generic server error
        toast.error("Nie udało się przypisać fiszki. Spróbuj ponownie później.");
        return { success: false, error: errorMessage };
      }

      // Success
      //const data: ApiResponse<FlashcardUpdatedDto> = await response.json();
      await response.json();
      toast.success("Fiszka została przypisana do decku");

      return { success: true };
    } catch (err) {
      // Network error
      const errorMessage = err instanceof Error ? err.message : "Błąd połączenia z serwerem";
      toast.error("Problem z połączeniem. Sprawdź internet i spróbuj ponownie.");
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    assign,
  };
}
