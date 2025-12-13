import type { APIRoute } from "astro";
import type { ApiErrorResponse, LearnResponseDto } from "../../../../types";
import { deckIdParamSchema, learnQuerySchema } from "../../../../lib/validation/learn.schema";
import { fetchReviewFlashcards, LearnErrorCodes } from "../../../../lib/services/learn.service";

export const prerender = false;

/**
 * GET /api/learn/:deckId
 * Retrieve flashcards due for review based on spaced repetition algorithm
 *
 * @param deckId - Deck ID (path parameter)
 * @query limit - Maximum number of flashcards to return (optional, 1-100, default 50)
 * @returns LearnResponseDto with flashcard data and metadata on success (200)
 * @returns ApiErrorResponse on error (400/404/500)
 */
export const GET: APIRoute = async ({ params, request, locals }) => {
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
    // Validate path parameter (deckId)
    const deckIdValidation = deckIdParamSchema.safeParse(params.deckId);
    if (!deckIdValidation.success) {
      const firstError = deckIdValidation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: firstError.message,
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const deckId = deckIdValidation.data;

    // Parse and validate query parameters
    const url = new URL(request.url);
    const queryParams = {
      limit: url.searchParams.get("limit") ?? undefined,
    };

    const queryValidation = learnQuerySchema.safeParse(queryParams);
    if (!queryValidation.success) {
      const firstError = queryValidation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: firstError.message,
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { limit } = queryValidation.data;

    // Fetch due flashcards using service
    let learnData: LearnResponseDto;
    try {
      learnData = await fetchReviewFlashcards(supabase, locals.user.id, deckId, limit);
    } catch (error) {
      if (error instanceof Error) {
        // Handle deck not found
        if (error.message === LearnErrorCodes.LEARN_DECK_NOT_FOUND) {
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
        if (error.message === LearnErrorCodes.DATABASE_ERROR) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Failed to retrieve flashcards. Please try again.",
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

    // Return successful response with LearnResponseDto (data + meta)
    return new Response(JSON.stringify(learnData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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
