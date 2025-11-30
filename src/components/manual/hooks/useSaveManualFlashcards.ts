import { useState } from "react";
import type {
  CreateFlashcardsCommand,
  FlashcardCreatedDto,
  ApiResponse,
  ApiErrorResponse,
} from "../../../types";
import type { ManualFlashcardRowViewModel, ManualSaveStats } from "../typesManual";

// ============================================================================
// Types
// ============================================================================

interface UseSaveManualFlashcardsReturn {
  saveFlashcards: (
    rows: ManualFlashcardRowViewModel[],
    deckId: number | null
  ) => Promise<ManualSaveStats>;
  isSaving: boolean;
  error: { message: string; code?: string } | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to save manually created flashcards to the backend
 * Always uses source: "manual" and generation_id: null
 */
export function useSaveManualFlashcards(): UseSaveManualFlashcardsReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const saveFlashcards = async (
    rows: ManualFlashcardRowViewModel[],
    deckId: number | null
  ): Promise<ManualSaveStats> => {
    setIsSaving(true);
    setError(null);

    try {
      const command: CreateFlashcardsCommand = {
        deck_id: deckId,
        source: "manual",
        generation_id: null,
        flashcards: rows.map((row) => ({
          front: row.front.trim(),
          back: row.back.trim(),
        })),
      };

      const response = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        setError(errorData.error);

        return {
          attempted: rows.length,
          saved: 0,
          failed: rows.length,
        };
      }

      const data: ApiResponse<FlashcardCreatedDto[]> = await response.json();
      const saved = data.data.length;

      return {
        attempted: rows.length,
        saved,
        failed: rows.length - saved,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Błąd połączenia sieciowego";
      setError({
        message: errorMessage,
        code: "NETWORK_ERROR",
      });

      return {
        attempted: rows.length,
        saved: 0,
        failed: rows.length,
      };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    saveFlashcards,
    isSaving,
    error,
  };
}

