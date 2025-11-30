import { useState, useEffect } from "react";
import type { DeckDto, ApiResponse, ApiErrorResponse } from "../../../types";
import type { DeckOptionViewModel } from "../typesManual";

// ============================================================================
// Types
// ============================================================================

interface UseDecksReturn {
  deckOptions: DeckOptionViewModel[];
  isLoading: boolean;
  error: { message: string; code?: string } | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to fetch decks and map them to DeckOptionViewModel for selector
 * Automatically adds "Nieprzypisane" option at the top
 */
export function useDecks(): UseDecksReturn {
  const [decks, setDecks] = useState<DeckDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const fetchDecks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/decks?sort=name_asc");

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        setError(errorData.error);
        setDecks([]);
        return;
      }

      const data: ApiResponse<DeckDto[]> = await response.json();
      setDecks(data.data);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Błąd połączenia sieciowego",
        code: "NETWORK_ERROR",
      });
      setDecks([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDecks();
  }, []);

  // Map decks to DeckOptionViewModel and add "Nieprzypisane" option
  const deckOptions: DeckOptionViewModel[] = [
    {
      id: null,
      label: "Nieprzypisane",
    },
    ...decks.map((deck) => ({
      id: deck.id,
      label: deck.name,
      flashcardCount: deck.flashcard_count,
    })),
  ];

  return {
    deckOptions,
    isLoading,
    error,
    refetch: fetchDecks,
  };
}

