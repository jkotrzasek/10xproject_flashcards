// ============================================================================
// Frontend ViewModels for Learn Session
// These types represent the client-side state and structure
// ============================================================================

/**
 * User's response to a flashcard review
 */
export type ReviewResponse = 'OK' | 'NOK';

/**
 * Phase of the learning session
 */
export type LearnPhase = 'loading' | 'learning' | 'summary' | 'empty' | 'error';

/**
 * Single flashcard in the learning session
 */
export interface LearnFlashcardViewModel {
  id: number;
  front: string;
  back: string;
  status: 'pending' | 'answered';
  lastResponse?: ReviewResponse;
}

/**
 * Metadata about the learning session (from API response)
 */
export interface LearnSessionMetaViewModel {
  totalDue: number;      // Number of cards due for review (NOK/not_checked)
  returned: number;      // Number of cards returned in this batch
  deckTotal: number;     // Total number of cards in the deck
}

/**
 * Statistics for the current learning session
 */
export interface LearnSessionStats {
  reviewedCount: number; // Number of cards reviewed in current session
  okCount: number;       // Number of "OK" responses
  nokCount: number;      // Number of "NOK" responses
}

/**
 * Single item in the review buffer (pending API submission)
 */
export interface ReviewBufferItem {
  flashcardId: number;
  response: ReviewResponse;
}

/**
 * Complete state of the learning session
 */
export interface LearnState {
  phase: LearnPhase;
  cards: LearnFlashcardViewModel[];
  currentIndex: number;
  isBackVisible: boolean;
  meta: LearnSessionMetaViewModel | null;
  stats: LearnSessionStats;
  reviewBuffer: ReviewBufferItem[];
  isFlushing: boolean;
  isTransitioning: boolean; // New: true when card is sliding out
  errorMessage?: string;
}

