import type { APIRoute } from "astro";
import { deckIdSchema } from "../../../../lib/validation/deck.schema";
import { resetDeckProgress, DeckErrorCodes } from "../../../../lib/services/deck.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import type { ApiErrorResponse } from "../../../../types";

export const prerender = false;

/**
 * User ID for MVP testing
 * TODO: Replace with actual authentication in future versions
 */
const USER_ID = DEFAULT_USER_ID;

/**
 * POST /api/decks/:deckId/reset-progress
 * Reset learning progress for all flashcards in a deck
 * Sets space_repetition to 'not_checked' and last_repetition to null
 * 
 * @param deckId - Deck ID from URL path
 * @returns 204 No Content on success
 * @returns ApiErrorResponse on error (400/401/404/500)
 */
export const POST: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;

  try {
    // Parse and validate deckId from URL path
    const validationResult = deckIdSchema.safeParse(params.deckId);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: `${firstError.message} for deckId`,
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const deckId = validationResult.data;

    // Reset deck progress using service
    try {
      await resetDeckProgress(supabase, USER_ID, deckId);
    } catch (error) {
      if (error instanceof Error) {
        // Handle deck not found
        if (error.message === DeckErrorCodes.DECK_NOT_FOUND) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Deck not found",
                code: "DECK_NOT_FOUND",
              },
            } satisfies ApiErrorResponse),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle database errors
        if (error.message === DeckErrorCodes.DATABASE_ERROR) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Failed to reset deck progress. Please try again.",
                code: "DATABASE_ERROR",
              },
            } satisfies ApiErrorResponse),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // Unexpected error
      throw error;
    }

    // Return successful response with 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/decks/:deckId/reset-progress:", error);

    return new Response(
      JSON.stringify({
        error: {
          message: "An unexpected error occurred. Please try again.",
          code: "INTERNAL_ERROR",
        },
      } satisfies ApiErrorResponse),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

