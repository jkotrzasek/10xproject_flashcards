import type { APIRoute } from "astro";
import type { ApiResponse, ApiErrorResponse, FlashcardDto, FlashcardCreatedDto } from "../../../types";
import { flashcardListQuerySchema, createFlashcardsSchema } from "../../../lib/validation/flashcard.schema";
import { listFlashcards, createFlashcards, FlashcardErrorCodes } from "../../../lib/services/flashcard.service";

export const prerender = false;

/**
 * GET /api/flashcards
 * Retrieve flashcards with optional filtering and sorting
 * 
 * @query deck_id - Filter by deck ID (optional)
 * @query unassigned - Show only unassigned flashcards (optional, must be 'true')
 * @query sort - Sort order (optional: created_asc, created_desc, updated_asc, updated_desc)
 * @query source - Filter by source (optional: ai_full, ai_edited, manual)
 * @query space_repetition - Filter by space repetition status (optional: OK, NOK, not_checked)
 * @returns ApiResponse<FlashcardDto[]> on success (200)
 * @returns ApiErrorResponse on error (400/404/500)
 */
export const GET: APIRoute = async ({ request, locals }) => {
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
    // Parse query parameters
    const url = new URL(request.url);
    const queryParams = {
      deck_id: url.searchParams.get("deck_id") ?? undefined,
      unassigned: url.searchParams.get("unassigned") ?? undefined,
      sort: url.searchParams.get("sort") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      space_repetition: url.searchParams.get("space_repetition") ?? undefined,
    };

    // Validate query parameters with Zod
    const validationResult = flashcardListQuerySchema.safeParse(queryParams);
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

    const { deck_id, unassigned, sort, source, space_repetition } = validationResult.data;

    // Retrieve flashcards using service
    let flashcards: FlashcardDto[];
    try {
      flashcards = await listFlashcards(supabase, locals.user.id, {
        deckId: deck_id,
        unassigned: unassigned,
        sort: sort,
        source: source,
        spaceRepetition: space_repetition,
      });
    } catch (error) {
      if (error instanceof Error) {
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

    // Return successful response
    const response: ApiResponse<FlashcardDto[]> = {
      data: flashcards,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/flashcards:", error);

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
 * POST /api/flashcards
 * Create multiple flashcards
 * 
 * @body CreateFlashcardsCommand { flashcards: CreateFlashcardItemCommand[] }
 * @returns ApiResponse<FlashcardCreatedDto[]> on success (201)
 * @returns ApiErrorResponse on error (400/404/500)
 */
export const POST: APIRoute = async ({ request, locals }) => {
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
    const validationResult = createFlashcardsSchema.safeParse(body);
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

    const { deck_id, source, generation_id, flashcards } = validationResult.data;

    // Create flashcards using service
    let createdFlashcards: FlashcardCreatedDto[];
    try {
      createdFlashcards = await createFlashcards(supabase, locals.user.id, deck_id, source, generation_id, flashcards);
    } catch (error) {
      if (error instanceof Error) {
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

        // Handle generation not found
        if (error.message === FlashcardErrorCodes.FLASHCARD_GENERATION_NOT_FOUND) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Generation not found or does not belong to user",
                code: "GENERATION_NOT_FOUND",
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
                message: "Failed to create flashcards. Please try again.",
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

    // Return successful response with 201 Created
    const response: ApiResponse<FlashcardCreatedDto[]> = {
      data: createdFlashcards,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/flashcards:", error);

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

