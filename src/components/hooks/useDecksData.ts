import { useState, useEffect, useCallback } from "react";
import type { DeckDto, FlashcardDto, ApiResponse } from "../../types";

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

function formatUpdatedLabel(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Przed chwilą";
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours}h temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;
  
  return date.toLocaleDateString("pl-PL", { 
    day: "numeric", 
    month: "short", 
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined 
  });
}

function mapToViewModel(deck: DeckDto): DeckCardViewModel {
  return {
    ...deck,
    updatedLabel: formatUpdatedLabel(deck.updated_at),
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

