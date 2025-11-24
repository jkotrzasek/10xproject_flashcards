import { useState, useEffect } from "react";
import type { DeckDto, ApiResponse, ApiErrorResponse } from "../../../types";

// ============================================================================
// Types
// ============================================================================

interface UseDecksReturn {
  decks: DeckDto[];
  isLoading: boolean;
  error: { message: string; code?: string } | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useDecks(): UseDecksReturn {
  const [decks, setDecks] = useState<DeckDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const fetchDecks = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/decks");

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
        message: err instanceof Error ? err.message : "Network error occurred",
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

  return {
    decks,
    isLoading,
    error,
    refetch: fetchDecks,
  };
}


