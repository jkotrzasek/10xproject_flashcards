import { useCallback, useState } from "react";
import type { LearnResponseDto, ReviewFlashcardItemCommand, ApiErrorResponse } from "../../../types";

/**
 * Hook providing API functions for learning session
 * Wraps fetch calls to existing /api/learn endpoints
 */
export function useLearnApi() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch flashcards for learning session
   * GET /api/learn/:deckId?limit=...
   */
  const fetchLearnFlashcards = useCallback(
    async (deckId: number, limit = 50): Promise<{ data: LearnResponseDto | null; error: string | null }> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/learn/${deckId}?limit=${limit}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData: ApiErrorResponse = await response.json();
          const errorMessage = errorData.error?.message || "Failed to fetch flashcards";
          setError(errorMessage);
          return { data: null, error: errorMessage };
        }

        const data: LearnResponseDto = await response.json();
        setIsLoading(false);
        return { data, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Network error";
        setError(errorMessage);
        setIsLoading(false);
        return { data: null, error: errorMessage };
      }
    },
    []
  );

  /**
   * Submit flashcard reviews
   * PATCH /api/learn/review
   */
  const submitReviews = useCallback(
    async (reviews: ReviewFlashcardItemCommand[]): Promise<{ success: boolean; error: string | null }> => {
      if (reviews.length === 0) {
        return { success: true, error: null };
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/learn/review", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ review: reviews }),
        });

        if (!response.ok) {
          const errorData: ApiErrorResponse = await response.json();
          const errorMessage = errorData.error?.message || "Failed to submit reviews";
          setError(errorMessage);
          return { success: false, error: errorMessage };
        }

        //const result: ApiResponse<{ updated: number }> = await response.json();
        await response.json();
        setIsLoading(false);
        return { success: true, error: null };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Network error";
        setError(errorMessage);
        setIsLoading(false);
        return { success: false, error: errorMessage };
      }
    },
    []
  );

  return {
    fetchLearnFlashcards,
    submitReviews,
    isLoading,
    error,
  };
}
