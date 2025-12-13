import { useState, useEffect, useCallback } from "react";
import type { FlashcardDto, ApiResponse, ApiErrorResponse } from "../../../types";
import type { DeckFlashcardVM } from "../../DeckDetailsPage";
import {
  formatDate,
  formatLastRepetitionLabel,
  getSourceLabel,
  getSpaceRepetitionLabel,
} from "../../../lib/format-date";

interface UseDeckFlashcardsReturn {
  flashcards: DeckFlashcardVM[];
  isLoading: boolean;
  error?: { message: string; code?: string };
  refetch: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapToViewModel(flashcard: FlashcardDto): DeckFlashcardVM {
  return {
    id: flashcard.id,
    front: flashcard.front,
    back: flashcard.back,
    source: getSourceLabel(flashcard.source),
    spaceRepetition: getSpaceRepetitionLabel(flashcard.space_repetition),
    lastRepetitionLabel: formatLastRepetitionLabel(flashcard.last_repetition),
    createdAtLabel: formatDate(flashcard.created_at),
    updatedAtLabel: formatDate(flashcard.updated_at),
    isDeleting: false,
    error: undefined,
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook do pobierania listy fiszek decku i mapowania ich na DeckFlashcardVM[]
 * Używa GET /api/flashcards?deck_id=:id&sort=created_asc
 */
export function useDeckFlashcards(deckId: number): UseDeckFlashcardsReturn {
  const [flashcards, setFlashcards] = useState<DeckFlashcardVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  const fetchFlashcards = useCallback(
    async (cancelled: { current: boolean }) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch(`/api/flashcards?deck_id=${deckId}&sort=created_asc`);

        if (!response.ok) {
          const errorData: ApiErrorResponse = await response.json();
          if (!cancelled.current) {
            setError({
              message: errorData.error.message || "Nie udało się pobrać fiszek",
              code: errorData.error.code,
            });
            setIsLoading(false);
          }
          return;
        }

        const data: ApiResponse<FlashcardDto[]> = await response.json();

        if (!cancelled.current) {
          const mappedFlashcards = data.data.map(mapToViewModel);
          setFlashcards(mappedFlashcards);
          setError(undefined);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled.current) {
          setError({
            message: err instanceof Error ? err.message : "Błąd sieci lub serwera",
          });
          setIsLoading(false);
        }
      }
    },
    [deckId]
  );

  useEffect(() => {
    const cancelled = { current: false };

    fetchFlashcards(cancelled);

    return () => {
      cancelled.current = true;
    };
  }, [refetchTrigger, fetchFlashcards]);

  return {
    flashcards,
    isLoading,
    error,
    refetch,
  };
}
