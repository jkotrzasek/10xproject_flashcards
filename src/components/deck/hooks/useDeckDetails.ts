import { useState, useEffect, useCallback } from "react";
import type { DeckDto, ApiResponse, ApiErrorResponse } from "../../../types";
import type { DeckHeaderVM } from "../../DeckDetailsPage";
import { formatDate } from "../../../lib/format-date";

interface UseDeckDetailsReturn {
  deck: DeckHeaderVM | null;
  isLoading: boolean;
  error?: { message: string; code?: string };
  refetch: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapToViewModel(deck: DeckDto): DeckHeaderVM {
  return {
    id: deck.id,
    name: deck.name,
    flashcardCount: deck.flashcard_count,
    createdAtLabel: formatDate(deck.created_at),
    updatedAtLabel: formatDate(deck.updated_at),
    isResettingProgress: false,
    error: undefined,
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook do pobierania szczegółów decku i mapowania na DeckHeaderVM
 * Używa GET /api/decks/:id
 */
export function useDeckDetails(deckId: number): UseDeckDetailsReturn {
  const [deck, setDeck] = useState<DeckHeaderVM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  const fetchDeck = useCallback(
    async (cancelled: { current: boolean }) => {
      setIsLoading(true);
      setError(undefined);

      try {
        const response = await fetch(`/api/decks/${deckId}`);

        if (!response.ok) {
          const errorData: ApiErrorResponse = await response.json();
          if (!cancelled.current) {
            setError({
              message: errorData.error.message || "Nie udało się pobrać decku",
              code: errorData.error.code,
            });
            setIsLoading(false);
          }
          return;
        }

        const data: ApiResponse<DeckDto> = await response.json();

        if (!cancelled.current) {
          const mappedDeck = mapToViewModel(data.data);
          setDeck(mappedDeck);
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

    fetchDeck(cancelled);

    return () => {
      cancelled.current = true;
    };
  }, [refetchTrigger, fetchDeck]);

  return {
    deck,
    isLoading,
    error,
    refetch,
  };
}
