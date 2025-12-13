import type { APIRoute } from "astro";
import type { ApiResponse, ApiErrorResponse, FlashcardDto, FlashcardUpdatedDto } from "../../../../types";
import { flashcardIdSchema, updateFlashcardSchema } from "../../../../lib/validation/flashcard.schema";
import {
  getFlashcardById,
  updateFlashcard,
  deleteFlashcard,
  FlashcardErrorCodes,
} from "../../../../lib/services/flashcard.service";

export const prerender = false;

/**
 * GET /api/flashcards/:id
 * Retrieve a single flashcard by ID
 *
 * @param flashcardId - Flashcard ID from URL path
 * @returns ApiResponse<FlashcardDto> on success (200)
 * @returns ApiErrorResponse on error (400/404/500)
 */
export const GET: APIRoute = async ({ params, locals }) => {
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
    // Validate flashcard ID from URL params
    const validationResult = flashcardIdSchema.safeParse(params.flashcardId);
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

    const flashcardId = validationResult.data;

    // Retrieve flashcard using service
    let flashcard: FlashcardDto;
    try {
      flashcard = await getFlashcardById(supabase, locals.user.id, flashcardId);
    } catch (error) {
      if (error instanceof Error) {
        // Handle flashcard not found
        if (error.message === FlashcardErrorCodes.FLASHCARD_NOT_FOUND) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Flashcard not found or does not belong to user",
                code: "FLASHCARD_NOT_FOUND",
              },
            } satisfies ApiErrorResponse),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle database errors
        if (error.message === FlashcardErrorCodes.DATABASE_ERROR) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Failed to retrieve flashcard. Please try again.",
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
    const response: ApiResponse<FlashcardDto> = {
      data: flashcard,
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

/**
 * PATCH /api/flashcards/:id
 * Update a flashcard
 *
 * @param flashcardId - Flashcard ID from URL path
 * @body UpdateFlashcardCommand { front?, back?, deck_id? }
 * @returns ApiResponse<FlashcardUpdatedDto> on success (200)
 * @returns ApiErrorResponse on error (400/404/500)
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
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
    // Validate flashcard ID from URL params
    const idValidationResult = flashcardIdSchema.safeParse(params.flashcardId);
    if (!idValidationResult.success) {
      const firstError = idValidationResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: `${firstError.message} for flashcardId`,
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const flashcardId = idValidationResult.data;

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
    const validationResult = updateFlashcardSchema.safeParse(body);
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

    const updates = validationResult.data;

    // Update flashcard using service
    let updatedFlashcard: FlashcardUpdatedDto;
    try {
      updatedFlashcard = await updateFlashcard(supabase, locals.user.id, flashcardId, updates);
    } catch (error) {
      if (error instanceof Error) {
        // Handle flashcard not found
        if (error.message === FlashcardErrorCodes.FLASHCARD_NOT_FOUND) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Flashcard not found or does not belong to user",
                code: "FLASHCARD_NOT_FOUND",
              },
            } satisfies ApiErrorResponse),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle deck not found
        if (error.message === FlashcardErrorCodes.FLASHCARD_DECK_NOT_FOUND) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Deck not found or does not belong to user",
                code: "DECK_NOT_FOUND",
              },
            } satisfies ApiErrorResponse),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle database errors
        if (error.message === FlashcardErrorCodes.DATABASE_ERROR) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Failed to update flashcard. Please try again.",
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
    const response: ApiResponse<FlashcardUpdatedDto> = {
      data: updatedFlashcard,
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

/**
 * DELETE /api/flashcards/:id
 * Delete a flashcard
 *
 * @param flashcardId - Flashcard ID from URL path
 * @returns 204 No Content on success
 * @returns ApiErrorResponse on error (400/404/500)
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
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
    // Validate flashcard ID from URL params
    const validationResult = flashcardIdSchema.safeParse(params.flashcardId);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: `${firstError.message} for flashcardId`,
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const flashcardId = validationResult.data;

    // Delete flashcard using service
    try {
      await deleteFlashcard(supabase, locals.user.id, flashcardId);
    } catch (error) {
      if (error instanceof Error) {
        // Handle flashcard not found
        if (error.message === FlashcardErrorCodes.FLASHCARD_NOT_FOUND) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Flashcard not found",
                code: "FLASHCARD_NOT_FOUND",
              },
            } satisfies ApiErrorResponse),
            { status: 404, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle database errors
        if (error.message === FlashcardErrorCodes.DATABASE_ERROR) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Failed to delete flashcard. Please try again.",
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

    // Return 204 No Content on successful deletion
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
