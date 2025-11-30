import { useState, useEffect, useCallback } from "react";
import type { FlashcardDto, ApiResponse, ApiErrorResponse, FlashcardSource, SpaceRepetitionStatus } from "../../../types";
import type { UnassignedFlashcardVM } from "../../UnassignedDeckPage";

interface UseUnassignedFlashcardsReturn {
  items: UnassignedFlashcardVM[];
  isLoading: boolean;
  error?: { message: string; code?: string };
  refetch: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

function formatDate(dateString: string): string {
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

function formatLastRepetitionLabel(lastRepetition: string | null): string | null {
  if (!lastRepetition) return "Brak powtórek";
  
  const date = new Date(lastRepetition);
  return `Ostatnia: ${date.toLocaleDateString("pl-PL", { 
    day: "numeric", 
    month: "short",
    year: "numeric"
  })}`;
}

function getSourceLabel(source: FlashcardSource): string {
  switch (source) {
    case "ai_full":
      return "AI";
    case "ai_edited":
      return "AI (edytowana)";
    case "manual":
      return "Manual";
    default:
      return "Nieznane";
  }
}

function getSpaceRepetitionLabel(status: SpaceRepetitionStatus): string {
  switch (status) {
    case "OK":
      return "OK";
    case "NOK":
      return "Do powtórki";
    case "not_checked":
      return "Nie oceniana";
    default:
      return "Nieznany status";
  }
}

function mapToViewModel(flashcard: FlashcardDto): UnassignedFlashcardVM {
  return {
    id: flashcard.id,
    front: flashcard.front,
    back: flashcard.back,
    source: getSourceLabel(flashcard.source),
    spaceRepetition: getSpaceRepetitionLabel(flashcard.space_repetition),
    lastRepetitionLabel: formatLastRepetitionLabel(flashcard.last_repetition),
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

