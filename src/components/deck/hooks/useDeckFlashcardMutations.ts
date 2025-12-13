import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { ApiErrorResponse } from "../../../types";

// ============================================================================
// Types
// ============================================================================

interface UpdateFlashcardParams {
  flashcardId: number;
  front: string;
  back: string;
}

interface UpdateFlashcardResult {
  success: boolean;
  error?: string;
  updatedAt?: string;
}

interface DeleteFlashcardResult {
  success: boolean;
  error?: string;
}

interface UseDeckFlashcardMutationsReturn {
  updateFlashcard: (params: UpdateFlashcardParams) => Promise<UpdateFlashcardResult>;
  deleteFlashcard: (flashcardId: number) => Promise<DeleteFlashcardResult>;
  isUpdating: boolean;
  isDeleting: boolean;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook do mutacji fiszek w decku (edycja i usuwanie)
 * - updateFlashcard: PATCH /api/flashcards/:id
 * - deleteFlashcard: DELETE /api/flashcards/:id
 */
export function useDeckFlashcardMutations(): UseDeckFlashcardMutationsReturn {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ============================================================================
  // Update Flashcard
  // ============================================================================

  const updateFlashcard = useCallback(
    async ({ flashcardId, front, back }: UpdateFlashcardParams): Promise<UpdateFlashcardResult> => {
      setIsUpdating(true);

      try {
        const response = await fetch(`/api/flashcards/${flashcardId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ front, back }),
        });

        if (!response.ok) {
          const errorData: ApiErrorResponse = await response.json();
          const errorMessage = errorData.error.message || "Nie udało się zaktualizować fiszki";

          // 404 - Flashcard not found
          if (response.status === 404) {
            toast.error("Fiszka nie istnieje lub została usunięta");
            setIsUpdating(false);
            return { success: false, error: "FLASHCARD_NOT_FOUND" };
          }

          // 400 - Invalid input
          if (response.status === 400) {
            setIsUpdating(false);
            return { success: false, error: errorMessage };
          }

          // 500 - Server error
          toast.error("Nie udało się zapisać zmian. Spróbuj ponownie później.");
          setIsUpdating(false);
          return { success: false, error: errorMessage };
        }

        // Success - 200
        //const data: ApiResponse<FlashcardUpdatedDto> = await response.json();
        await response.json();
        toast.success("Fiszka zaktualizowana");
        setIsUpdating(false);

        // Return updated timestamp
        return {
          success: true,
          updatedAt: new Date().toISOString(), // Backend nie zwraca updated_at, więc używamy lokalnego czasu
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Błąd połączenia z serwerem";
        toast.error("Problem z połączeniem. Sprawdź internet i spróbuj ponownie.");
        setIsUpdating(false);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  // ============================================================================
  // Delete Flashcard
  // ============================================================================

  const deleteFlashcard = useCallback(async (flashcardId: number): Promise<DeleteFlashcardResult> => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/flashcards/${flashcardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        if (response.status !== 204) {
          const errorData: ApiErrorResponse = await response.json();
          const errorMessage = errorData.error.message || "Nie udało się usunąć fiszki";

          // 404 - Flashcard not found (treat as success)
          if (response.status === 404) {
            toast.info("Fiszka już nie istnieje");
            setIsDeleting(false);
            return { success: true };
          }

          // 500 - Server error
          toast.error("Nie udało się usunąć fiszki. Spróbuj ponownie później.");
          setIsDeleting(false);
          return { success: false, error: errorMessage };
        }
      }

      // Success - 204 No Content
      toast.success("Fiszka została usunięta");
      setIsDeleting(false);
      return { success: true };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Błąd połączenia z serwerem";
      toast.error("Problem z połączeniem. Sprawdź internet i spróbuj ponownie.");
      setIsDeleting(false);
      return { success: false, error: errorMessage };
    }
  }, []);

  return {
    updateFlashcard,
    deleteFlashcard,
    isUpdating,
    isDeleting,
  };
}
