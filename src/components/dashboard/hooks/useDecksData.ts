import { useState, useEffect, useCallback } from "react";
import type { DeckDto, FlashcardDto, ApiResponse } from "../../../types";
import { formatDate } from "../../../lib/format-date";

// ============================================================================
// Types
// ============================================================================

type DeckSortOption = "name_asc" | "name_desc" | "created_asc" | "created_desc" | "updated_asc" | "updated_desc";

interface DeckCardViewModel extends DeckDto {
  updatedLabel: string;
  isMutating: boolean;
}

interface UseDecksDataResult {
  decks: DeckCardViewModel[];
  unassignedCount: number;
  isLoading: boolean;
  hasError: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function mapToViewModel(deck: DeckDto): DeckCardViewModel {
  return {
    ...deck,
    updatedLabel: formatDate(deck.updated_at),
    isMutating: false,
  };
}

// ============================================================================
// Hook
// ============================================================================

export function useDecksData(sort: DeckSortOption): UseDecksDataResult {
  const [decks, setDecks] = useState<DeckCardViewModel[]>([]);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      if (!isCancelled) {
        setIsLoading(true);
        setError(null);
      }

      try {
        // Równoległe pobieranie decków i licznika nieprzypisanych
        const [decksResponse, unassignedResponse] = await Promise.all([
          fetch(`/api/decks?sort=${sort}`),
          fetch(`/api/flashcards?unassigned=true`),
        ]);

        // Obsługa 401 - przekierowanie do logowania
        if (decksResponse.status === 401 || unassignedResponse.status === 401) {
          window.location.href = "/login";
          throw new Error("Sesja wygasła. Zaloguj się ponownie.");
        }

        if (!decksResponse.ok) {
          throw new Error(`Failed to fetch decks: ${decksResponse.status}`);
        }

        if (!unassignedResponse.ok) {
          throw new Error(`Failed to fetch unassigned count: ${unassignedResponse.status}`);
        }

        const decksData: ApiResponse<DeckDto[]> = await decksResponse.json();
        const unassignedData: ApiResponse<FlashcardDto[]> = await unassignedResponse.json();

        if (!isCancelled) {
          setDecks(decksData.data.map(mapToViewModel));
          setUnassignedCount(unassignedData.data.length);
          setIsLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [sort, refetchTrigger]);

  return {
    decks,
    unassignedCount,
    isLoading,
    hasError: error !== null,
    error,
    refetch,
  };
}
