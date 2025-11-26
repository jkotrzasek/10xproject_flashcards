import { useState, useEffect, useCallback } from "react";
import type { DeckDto, ApiResponse, ApiErrorResponse } from "../../../types";
import type { DeckOptionVM } from "../../UnassignedDeckPage";

interface UseDeckOptionsReturn {
  options: DeckOptionVM[];
  isLoading: boolean;
  error?: { message: string; code?: string };
  refetch: () => void;
}

/**
 * Hook do pobierania listy decków i mapowania ich na opcje dropdownu
 * Używa GET /api/decks?sort=name_asc
 */
export function useDeckOptions(): UseDeckOptionsReturn {
  const [options, setOptions] = useState<DeckOptionVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | undefined>();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  const fetchDecks = useCallback(async (cancelled: { current: boolean }) => {
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch("/api/decks?sort=name_asc");

      if (!response.ok) {
        // Parse error response
        const errorData: ApiErrorResponse = await response.json();
        if (!cancelled.current) {
          setError({
            message: errorData.error.message || "Nie udało się pobrać decków",
            code: errorData.error.code,
          });
          setIsLoading(false);
        }
        return;
      }

      const data: ApiResponse<DeckDto[]> = await response.json();

      if (!cancelled.current) {
        // Map DeckDto[] to DeckOptionVM[]
        const mappedOptions: DeckOptionVM[] = data.data.map((deck) => ({
          id: deck.id,
          name: deck.name,
        }));

        setOptions(mappedOptions);
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

    fetchDecks(cancelled);

    return () => {
      cancelled.current = true;
    };
  }, [refetchTrigger, fetchDecks]);

  return {
    options,
    isLoading,
    error,
    refetch,
  };
}

