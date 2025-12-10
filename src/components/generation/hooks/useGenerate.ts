import { useState } from "react";
import type { CreateGenerationCommand, GenerationResultDto, ApiResponse, ApiErrorResponse } from "../../../types";
import type { FlashcardProposalVM } from "../generationTypes";

// ============================================================================
// Types
// ============================================================================

interface UseGenerateReturn {
  generate: (inputText: string) => Promise<{
    sessionId: number;
    proposals: FlashcardProposalVM[];
  } | null>;
  isGenerating: boolean;
  error: { message: string; code?: string } | null;
}

// ============================================================================
// Hook
// ============================================================================

export function useGenerate(): UseGenerateReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const generate = async (
    inputText: string
  ): Promise<{ sessionId: number; proposals: FlashcardProposalVM[] } | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const command: CreateGenerationCommand = {
        input_text: inputText,
      };

      const response = await fetch("/api/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        setError(errorData.error);
        return null;
      }

      const data: ApiResponse<GenerationResultDto> = await response.json();
      const result = data.data;

      // Map FlashcardProposalDto[] to FlashcardProposalVM[]
      const proposals: FlashcardProposalVM[] = result.flashcards_proposals.map((proposal, index) => ({
        id: index,
        index,
        originalFront: proposal.front,
        originalBack: proposal.back,
        front: proposal.front,
        back: proposal.back,
        accepted: false, // Default to reject (user can check)
        isEdited: false,
        errors: undefined,
        savingState: "idle",
        errorCode: undefined,
      }));

      return {
        sessionId: result.session_id,
        proposals,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Network error occurred";
      setError({
        message: errorMessage,
        code: "NETWORK_ERROR",
      });
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generate,
    isGenerating,
    error,
  };
}
