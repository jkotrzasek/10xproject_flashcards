import type { APIRoute } from "astro";
import type { ApiResponse, ApiErrorResponse } from "../../../types";
import { reviewFlashcardsSchema } from "../../../lib/validation/learn.schema";
import { applyFlashcardReviews, LearnErrorCodes } from "../../../lib/services/learn.service";

export const prerender = false;

/**
 * PATCH /api/learn/review
 * Apply flashcard reviews from user learning session
 * Updates space_repetition status and last_repetition timestamp
 *
 * @body ReviewFlashcardsCommand { review: ReviewFlashcardItemCommand[] }
 * @returns ApiResponse<{ updated: number }> on success (200)
 * @returns ApiErrorResponse on error (400/404/500)
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
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
    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid JSON in request body",
            code: "INVALID_JSON",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate input with Zod schema
    const validationResult = reviewFlashcardsSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
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

    const { review } = validationResult.data;

    // Check for duplicate flashcard_id in review array
    const flashcardIds = review.map((item) => item.flashcard_id);
    const uniqueIds = new Set(flashcardIds);
    if (uniqueIds.size !== flashcardIds.length) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Duplicate flashcard IDs are not allowed in review array",
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Apply flashcard reviews using service
    let updatedCount: number;
    try {
      updatedCount = await applyFlashcardReviews(supabase, locals.user.id, review);
    } catch (error) {
      if (error instanceof Error) {
        // Handle flashcard not found
        if (error.message === LearnErrorCodes.LEARN_FLASHCARD_NOT_FOUND) {
          return new Response(
            JSON.stringify({
              error: {
                message: "One or more flashcards not found or do not belong to user",
                code: "FLASHCARD_NOT_FOUND",
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
                message: "Failed to update flashcard reviews. Please try again.",
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

    // Return successful response
    const response: ApiResponse<{ updated: number }> = {
      data: {
        updated: updatedCount,
      },
    };

    return new Response(JSON.stringify(response), {
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
