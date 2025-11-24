import { useState } from "react";
import type {
  CreateFlashcardsCommand,
  FlashcardCreatedDto,
  ApiResponse,
  ApiErrorResponse,
} from "../../../types";
import type { FlashcardProposalVM, SaveStats } from "../generationTypes";

// ============================================================================
// Types
// ============================================================================

interface UseSaveFlashcardsReturn {
  saveFlashcards: (
    proposals: FlashcardProposalVM[],
    sessionId: number,
    deckId: number | null | undefined
  ) => Promise<SaveStats>;
  isSaving: boolean;
  error: { message: string; code?: string } | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useSaveFlashcards(): UseSaveFlashcardsReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const saveFlashcards = async (
    proposals: FlashcardProposalVM[],
    sessionId: number,
    deckId: number | null | undefined
  ): Promise<SaveStats> => {
    setIsSaving(true);
    setError(null);

    try {
      // Separate proposals into ai_full (unedited) and ai_edited (edited)
      const unedited = proposals.filter((p) => !p.isEdited);
      const edited = proposals.filter((p) => p.isEdited);

      const results: FlashcardCreatedDto[] = [];
      const failedIds: number[] = [];
      const savedIds: number[] = [];

      // Save unedited flashcards (ai_full)
      if (unedited.length > 0) {
        const uneditedCommand: CreateFlashcardsCommand = {
          deck_id: deckId === undefined ? null : deckId,
          source: "ai_full",
          generation_id: sessionId,
          flashcards: unedited.map((p) => ({
            front: p.front,
            back: p.back,
          })),
        };

        try {
          const response = await fetch("/api/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(uneditedCommand),
          });

          if (response.ok) {
            const data: ApiResponse<FlashcardCreatedDto[]> = await response.json();
            results.push(...data.data);
            // Track successfully saved IDs
            unedited.forEach((p) => savedIds.push(p.id));
          } else {
            // Track failed ones
            unedited.forEach((p) => failedIds.push(p.id));
          }
        } catch {
          unedited.forEach((p) => failedIds.push(p.id));
        }
      }

      // Save edited flashcards (ai_edited)
      if (edited.length > 0) {
        const editedCommand: CreateFlashcardsCommand = {
          deck_id: deckId === undefined ? null : deckId,
          source: "ai_edited",
          generation_id: sessionId,
          flashcards: edited.map((p) => ({
            front: p.front,
            back: p.back,
          })),
        };

        try {
          const response = await fetch("/api/flashcards", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(editedCommand),
          });

          if (response.ok) {
            const data: ApiResponse<FlashcardCreatedDto[]> = await response.json();
            results.push(...data.data);
            // Track successfully saved IDs
            edited.forEach((p) => savedIds.push(p.id));
          } else {
            // Track failed ones
            edited.forEach((p) => failedIds.push(p.id));
          }
        } catch {
          edited.forEach((p) => failedIds.push(p.id));
        }
      }

      const attempted = proposals.length;
      const saved = results.length;
      const failed = failedIds.length;

      if (failed > 0 && saved === 0) {
        setError({
          message: "Nie udało się zapisać żadnej fiszki",
          code: "SAVE_FAILED",
        });
      } else if (failed > 0) {
        setError({
          message: `Zapisano ${saved} z ${attempted} fiszek`,
          code: "PARTIAL_SAVE",
        });
      }

      return { attempted, saved, failed, savedIds, failedIds };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error occurred";
      setError({
        message: errorMessage,
        code: "NETWORK_ERROR",
      });
      return {
        attempted: proposals.length,
        saved: 0,
        failed: proposals.length,
        savedIds: [],
        failedIds: proposals.map((p) => p.id),
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

