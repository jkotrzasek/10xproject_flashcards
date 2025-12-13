import { useState, useEffect, useCallback } from "react";
import type { FlashcardDto, ApiResponse, ApiErrorResponse } from "../../../types";
import type { UnassignedFlashcardVM } from "../../UnassignedDeckPage";
import {
  formatDate,
  formatLastRepetitionLabel,
  getSourceLabel,
  getSpaceRepetitionLabel,
} from "../../../lib/format-date";

interface UseUnassignedFlashcardsReturn {
  items: UnassignedFlashcardVM[];
  isLoading: boolean;
  error?: { message: string; code?: string };
  refetch: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapToViewModel(flashcard: FlashcardDto): UnassignedFlashcardVM {
  return {
    id: flashcard.id,
    front: flashcard.front,
    back: flashcard.back,
    source: getSourceLabel(flashcard.source),
    spaceRepetition: getSpaceRepetitionLabel(flashcard.space_repetition),
    lastRepetitionLabel: formatLastRepetitionLabel(flashcard.last_repetition, "Brak powtórek"),
    createdAtLabel: formatDate(flashcard.created_at),
    updatedAtLabel: formatDate(flashcard.updated_at),
    isAssigning: false,
    assignError: undefined,
  };
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook do pobierania listy nieprzypisanych fiszek i mapowania ich na UnassignedFlashcardVM[]
 * Używa GET /api/flashcards?unassigned=true&sort=created_asc
 */
export function useUnassignedFlashcards(): UseUnassignedFlashcardsReturn {
  const [items, setItems] = useState<UnassignedFlashcardVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  const fetchFlashcards = useCallback(async (cancelled: { current: boolean }) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/flashcards?unassigned=true&sort=created_asc");

      if (!response.ok) {
        // Parse error response
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
        // Map FlashcardDto[] to UnassignedFlashcardVM[]
        const mappedItems: UnassignedFlashcardVM[] = data.data.map(mapToViewModel);

        setItems(mappedItems);
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
  }, []);

  useEffect(() => {
    const cancelled = { current: false };

    fetchFlashcards(cancelled);

    return () => {
      cancelled.current = true;
    };
  }, [refetchTrigger, fetchFlashcards]);

  return {
    items,
    isLoading,
    error,
    refetch,
  };
}
