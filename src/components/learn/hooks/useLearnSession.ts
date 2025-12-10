import { useState, useEffect, useCallback } from "react";
import type {
  LearnFlashcardViewModel,
  LearnSessionMetaViewModel,
  LearnSessionStats,
  LearnPhase,
  ReviewBufferItem,
  ReviewResponse,
  LearnState,
} from "../typesLearn";
import type { FlashcardLearnDto, LearnMetaDto, ReviewFlashcardItemCommand } from "../../../types";
import { useLearnApi } from "./useLearnApi";

// Threshold for auto-flushing review buffer
const FLUSH_THRESHOLD = 10;

// Default limit for flashcards per session
const DEFAULT_LIMIT = 20;

/**
 * Main hook managing the learning session lifecycle
 * Handles fetching cards, user interactions, review buffer, and state transitions
 */
export function useLearnSession(deckId: number, limit: number = DEFAULT_LIMIT) {
  const { fetchLearnFlashcards, submitReviews } = useLearnApi();

  const [state, setState] = useState<LearnState>({
    phase: "loading",
    cards: [],
    currentIndex: 0,
    isBackVisible: false,
    meta: null,
    stats: {
      reviewedCount: 0,
      okCount: 0,
      nokCount: 0,
    },
    reviewBuffer: [],
    isFlushing: false,
    isTransitioning: false,
    errorMessage: undefined,
  });

  /**
   * Map API DTO to ViewModel
   */
  const mapFlashcardToViewModel = useCallback((dto: FlashcardLearnDto): LearnFlashcardViewModel => {
    return {
      id: dto.id,
      front: dto.front,
      back: dto.back,
      status: "pending",
    };
  }, []);

  /**
   * Map API meta to ViewModel
   */
  const mapMetaToViewModel = useCallback((meta: LearnMetaDto): LearnSessionMetaViewModel => {
    return {
      totalDue: meta.total_due,
      returned: meta.returned,
      deckTotal: meta.deck_total,
    };
  }, []);

  /**
   * Flush review buffer to API
   */
  const flushBuffer = useCallback(
    async (buffer: ReviewBufferItem[]): Promise<boolean> => {
      if (buffer.length === 0) {
        return true;
      }

      setState((prev) => ({ ...prev, isFlushing: true }));

      // Convert buffer to API format
      const reviewCommands: ReviewFlashcardItemCommand[] = buffer.map((item) => ({
        flashcard_id: item.flashcardId,
        response: item.response,
      }));

      // Limit to 100 items (API validation limit)
      const payload = reviewCommands.slice(0, 100);

      const result = await submitReviews(payload);

      setState((prev) => ({ ...prev, isFlushing: false }));

      if (!result.success) {
        setState((prev) => ({
          ...prev,
          errorMessage: result.error || "Failed to submit reviews",
        }));
        return false;
      }

      return true;
    },
    [submitReviews]
  );

  /**
   * Load flashcards from API
   */
  const loadFlashcards = useCallback(async () => {
    setState((prev) => ({ ...prev, phase: "loading", errorMessage: undefined }));

    const result = await fetchLearnFlashcards(deckId, limit);

    if (result.error || !result.data) {
      setState((prev) => ({
        ...prev,
        phase: "error",
        errorMessage: result.error || "Failed to load flashcards",
      }));
      return;
    }

    const { data, meta } = result.data;

    // No cards available
    if (data.length === 0) {
      setState((prev) => ({
        ...prev,
        phase: "empty",
        meta: mapMetaToViewModel(meta),
      }));
      return;
    }

    // Initialize learning session
    setState((prev) => ({
      ...prev,
      phase: "learning",
      cards: data.map(mapFlashcardToViewModel),
      currentIndex: 0,
      isBackVisible: false,
      meta: mapMetaToViewModel(meta),
      stats: {
        reviewedCount: 0,
        okCount: 0,
        nokCount: 0,
      },
      reviewBuffer: [],
    }));
  }, [deckId, limit, fetchLearnFlashcards, mapFlashcardToViewModel, mapMetaToViewModel]);

  /**
   * Reveal answer (back of card)
   */
  const revealAnswer = useCallback(() => {
    setState((prev) => {
      if (prev.isBackVisible) {
        return prev;
      }
      return { ...prev, isBackVisible: true };
    });
  }, []);

  /**
   * Answer current flashcard
   */
  const answerCurrent = useCallback(
    async (response: ReviewResponse) => {
      setState((prev) => {
        // Guard: answer not visible yet
        if (!prev.isBackVisible || prev.phase !== "learning") {
          return prev;
        }

        const currentCard = prev.cards[prev.currentIndex];
        if (!currentCard) {
          return prev;
        }

        // Update stats
        const newStats: LearnSessionStats = {
          reviewedCount: prev.stats.reviewedCount + 1,
          okCount: prev.stats.okCount + (response === "OK" ? 1 : 0),
          nokCount: prev.stats.nokCount + (response === "NOK" ? 1 : 0),
        };

        // Update current card status
        const updatedCards = [...prev.cards];
        updatedCards[prev.currentIndex] = {
          ...currentCard,
          status: "answered",
          lastResponse: response,
        };

        // Add to review buffer
        const newBuffer: ReviewBufferItem[] = [...prev.reviewBuffer, { flashcardId: currentCard.id, response }];

        // Check if this is the last card
        const isLastCard = prev.currentIndex >= prev.cards.length - 1;

        if (isLastCard) {
          // Move to summary phase and flush buffer
          flushBuffer(newBuffer);
          return {
            ...prev,
            phase: "summary" as LearnPhase,
            cards: updatedCards,
            stats: newStats,
            reviewBuffer: [], // Clear buffer after flush
          };
        }

        // Check if we need to flush buffer
        const shouldFlush = newBuffer.length >= FLUSH_THRESHOLD;
        if (shouldFlush) {
          flushBuffer(newBuffer);
        }

        // Start transition animation (slide-out)
        // Card will move to next after animation completes
        return {
          ...prev,
          cards: updatedCards,
          stats: newStats,
          reviewBuffer: shouldFlush ? [] : newBuffer,
          isTransitioning: true,
        };
      });

      setState((prev) => {
        // Check if we're still in learning phase and transitioning
        if (prev.phase !== "learning" || !prev.isTransitioning) {
          return prev;
        }

        return {
          ...prev,
          isBackVisible: false,
        };
      });

      // Wait for slide-out animation to complete, then move to next card
      setTimeout(() => {
        setState((prev) => {
          // Check if we're still in learning phase and transitioning
          if (prev.phase !== "learning" || !prev.isTransitioning) {
            return prev;
          }

          return {
            ...prev,
            currentIndex: prev.currentIndex + 1,
            isBackVisible: false,
            isTransitioning: false,
          };
        });
      }, 400); // Animation duration
    },
    [flushBuffer]
  );

  /**
   * Continue with new session (fetch new cards)
   */
  const continueSession = useCallback(() => {
    loadFlashcards();
  }, [loadFlashcards]);

  /**
   * Navigate to deck details
   */
  const goToDeck = useCallback(() => {
    window.location.href = `/decks/${deckId}`;
  }, [deckId]);

  /**
   * Load flashcards on mount
   */
  useEffect(() => {
    if (deckId > 0) {
      loadFlashcards();
    }
  }, [deckId, loadFlashcards]);

  return {
    // State
    phase: state.phase,
    cards: state.cards,
    currentCard: state.cards[state.currentIndex] || null,
    currentIndex: state.currentIndex,
    isBackVisible: state.isBackVisible,
    isTransitioning: state.isTransitioning,
    meta: state.meta,
    stats: state.stats,
    isFlushing: state.isFlushing,
    errorMessage: state.errorMessage,

    // Actions
    revealAnswer,
    answerCurrent,
    continueSession,
    goToDeck,
    retryLoad: loadFlashcards,
  };
}
