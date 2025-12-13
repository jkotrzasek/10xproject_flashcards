import type { APIRoute } from "astro";
import { deckIdSchema } from "../../../../lib/validation/deck.schema";
import { resetDeckProgress, DeckErrorCodes } from "../../../../lib/services/deck.service";
import type { ApiErrorResponse } from "../../../../types";

export const prerender = false;

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

  // Check if user is authenticated
  if (!locals.user) {
    return new Response(
      JSON.stringify({
        error: {
          message: "Authentication required",
          code: "UNAUTHORIZED",
        },
      } satisfies ApiErrorResponse),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

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
      await resetDeckProgress(supabase, locals.user.id, deckId);
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
  } catch {
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
