import type { SupabaseClient } from "../../db/supabase.client";
import type { FlashcardLearnDto, LearnResponseDto, ReviewFlashcardItemCommand } from "../../types";
import { getDeckById, DeckErrorCodes } from "./deck.service";

/**
 * Domain error codes for learn operations
 */
export const LearnErrorCodes = {
  LEARN_DECK_NOT_FOUND: "LEARN_DECK_NOT_FOUND",
  LEARN_FLASHCARD_NOT_FOUND: "LEARN_FLASHCARD_NOT_FOUND",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

/**
 * Fetch flashcards due for review based on spaced repetition algorithm
 * Priority: not_checked/NOK first, then OK cards to fill remaining slots
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the deck
 * @param deckId - Deck ID to fetch flashcards from
 * @param limit - Maximum number of flashcards to return (1-100)
 * @returns Object with flashcard data and metadata
 * @throws Error with LearnErrorCodes.LEARN_DECK_NOT_FOUND if deck doesn't exist or doesn't belong to user
 * @throws Error with LearnErrorCodes.DATABASE_ERROR on database errors
 */
export async function fetchReviewFlashcards(
  supabase: SupabaseClient,
  userId: string,
  deckId: number,
  limit: number
): Promise<LearnResponseDto> {
  try {
    // Verify deck exists and belongs to user
    try {
      await getDeckById(supabase, userId, deckId);
    } catch (error) {
      if (error instanceof Error && error.message === DeckErrorCodes.DECK_NOT_FOUND) {
        throw new Error(LearnErrorCodes.LEARN_DECK_NOT_FOUND);
      }
      throw error;
    }

    // Get total flashcard count in deck
    const { count: deckTotal, error: countError } = await supabase
      .from("flashcards")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("deck_id", deckId);

    if (countError) {
      throw new Error(LearnErrorCodes.DATABASE_ERROR);
    }

    const deck_total = deckTotal ?? 0;

    // ============================================================================
    // BASIC ALGORITHM (temporary solution, to be replaced in future iterations)
    // ============================================================================
    // Step 1: Fetch priority flashcards (NOK and not_checked)
    // Step 2: If not enough, fill remaining slots with OK cards
    //
    // TODO (Future): Implement advanced spaced repetition algorithm with:
    // - Time-based filtering for OK cards (older than X days)
    // - Guaranteed minimum percentage of OK cards for review
    // - Scheduling based on last_repetition timestamp
    // ============================================================================

    // Fetch priority flashcards: not_checked and NOK
    const { data: priorityFlashcards, error: priorityError } = await supabase
      .from("flashcards")
      .select("id, front, back")
      .eq("user_id", userId)
      .eq("deck_id", deckId)
      .in("space_repetition", ["not_checked", "NOK"])
      .order("updated_at", { ascending: true })
      .limit(limit);

    if (priorityError) {
      throw new Error(LearnErrorCodes.DATABASE_ERROR);
    }

    const priorityCards: FlashcardLearnDto[] = priorityFlashcards ?? [];
    const remaining = limit - priorityCards.length;

    // If we have enough priority cards or no remaining slots, return them
    if (remaining <= 0) {
      const total_due = priorityCards.length;

      const response: LearnResponseDto = {
        data: priorityCards,
        meta: {
          total_due,
          returned: priorityCards.length,
          deck_total,
        },
      };

      return response;
    }

    // Fetch OK cards to fill remaining slots
    const { data: okFlashcards, error: okError } = await supabase
      .from("flashcards")
      .select("id, front, back")
      .eq("user_id", userId)
      .eq("deck_id", deckId)
      .eq("space_repetition", "OK")
      .order("updated_at", { ascending: true })
      .limit(remaining);

    if (okError) {
      throw new Error(LearnErrorCodes.DATABASE_ERROR);
    }

    const okCards: FlashcardLearnDto[] = okFlashcards ?? [];

    // Combine priority and OK cards
    const data = [...priorityCards, ...okCards];
    const total_due = priorityCards.length; // Only priority cards count as "due"

    const response: LearnResponseDto = {
      data,
      meta: {
        total_due,
        returned: data.length,
        deck_total,
      },
    };

    return response;
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && (Object.values(LearnErrorCodes) as string[]).includes(error.message)) {
      throw error;
    }

    // Log and wrap unexpected errors
    throw new Error(LearnErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Apply flashcard reviews from user learning session
 * Updates space_repetition status for reviewed flashcards
 * Trigger automatically updates last_repetition timestamp
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcards
 * @param reviews - Array of flashcard reviews with IDs and responses
 * @returns Number of successfully updated flashcards
 * @throws Error with LearnErrorCodes.LEARN_FLASHCARD_NOT_FOUND if any flashcard doesn't exist or doesn't belong to user
 * @throws Error with LearnErrorCodes.DATABASE_ERROR on database errors
 */
export async function applyFlashcardReviews(
  supabase: SupabaseClient,
  userId: string,
  reviews: ReviewFlashcardItemCommand[]
): Promise<number> {
  try {
    // Extract flashcard IDs from reviews
    const flashcardIds = reviews.map((review) => review.flashcard_id);

    // Verify all flashcards exist and belong to user
    const { data: flashcards, error: fetchError } = await supabase
      .from("flashcards")
      .select("id, user_id")
      .eq("user_id", userId)
      .in("id", flashcardIds);

    if (fetchError) {
      throw new Error(LearnErrorCodes.DATABASE_ERROR);
    }

    // Check if all flashcards were found
    if (!flashcards || flashcards.length !== flashcardIds.length) {
      throw new Error(LearnErrorCodes.LEARN_FLASHCARD_NOT_FOUND);
    }

    // Update each flashcard with its review status
    // Using Promise.allSettled to handle partial failures gracefully
    const updatePromises = reviews.map(async (review) => {
      const { error } = await supabase
        .from("flashcards")
        .update({
          space_repetition: review.response,
          updated_at: new Date().toISOString(),
        })
        .eq("id", review.flashcard_id)
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      return review.flashcard_id;
    });

    const results = await Promise.allSettled(updatePromises);

    // Count successful updates
    const successCount = results.filter((result) => result.status === "fulfilled").length;

    // If no updates succeeded, throw database error
    if (successCount === 0) {
      throw new Error(LearnErrorCodes.DATABASE_ERROR);
    }

    return successCount;
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && (Object.values(LearnErrorCodes) as string[]).includes(error.message)) {
      throw error;
    }

    // Log and wrap unexpected errors
    throw new Error(LearnErrorCodes.DATABASE_ERROR);
  }
}
