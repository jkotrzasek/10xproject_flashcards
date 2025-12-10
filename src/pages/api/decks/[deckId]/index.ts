import type { APIRoute } from "astro";
import { deckIdSchema, updateDeckSchema } from "../../../../lib/validation/deck.schema";
import { getDeckById, updateDeckName, deleteDeck, DeckErrorCodes } from "../../../../lib/services/deck.service";
import type { ApiResponse, DeckDto, DeckUpdatedDto, ApiErrorResponse } from "../../../../types";

export const prerender = false;

/**
 * GET /api/decks/:deckId
 * Retrieve a specific deck by ID
 *
 * @param deckId - Deck ID from URL path
 * @returns ApiResponse<DeckDto> on success (200)
 * @returns ApiErrorResponse on error (400/401/404/500)
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
    // Parse and validate deckId from URL path
    const validationResult = deckIdSchema.safeParse(params.deckId);
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

    const deckId = validationResult.data;

    // Retrieve deck using service
    let deck: DeckDto;
    try {
      deck = await getDeckById(supabase, locals.user.id, deckId);
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
                message: "Failed to retrieve deck. Please try again.",
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
    const response: ApiResponse<DeckDto> = {
      data: deck,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/decks/:deckId:", error);

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
 * PATCH /api/decks/:deckId
 * Update deck name
 *
 * @param deckId - Deck ID from URL path
 * @body UpdateDeckCommand { name: string }
 * @returns ApiResponse<DeckUpdatedDto> on success (200)
 * @returns ApiErrorResponse on error (400/401/404/409/500)
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
    // Parse and validate deckId from URL path
    const deckIdValidation = deckIdSchema.safeParse(params.deckId);
    if (!deckIdValidation.success) {
      const firstError = deckIdValidation.error.errors[0];
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

    const deckId = deckIdValidation.data;

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
    const validationResult = updateDeckSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: `${firstError.message} for name`,
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { name } = validationResult.data;

    // Update deck using service
    let updatedDeck: DeckUpdatedDto;
    try {
      updatedDeck = await updateDeckName(supabase, locals.user.id, deckId, name);
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

        // Handle deck name conflict (duplicate name for user)
        if (error.message === DeckErrorCodes.DECK_NAME_CONFLICT) {
          return new Response(
            JSON.stringify({
              error: {
                message: "A deck with this name already exists",
                code: "DECK_NAME_CONFLICT",
              },
            } satisfies ApiErrorResponse),
            { status: 409, headers: { "Content-Type": "application/json" } }
          );
        }

        // Handle database errors
        if (error.message === DeckErrorCodes.DATABASE_ERROR) {
          return new Response(
            JSON.stringify({
              error: {
                message: "Failed to update deck. Please try again.",
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
    const response: ApiResponse<DeckUpdatedDto> = {
      data: updatedDeck,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in PATCH /api/decks/:deckId:", error);

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
 * DELETE /api/decks/:deckId
 * Delete a deck and all associated flashcards
 *
 * @param deckId - Deck ID from URL path
 * @returns 204 No Content on success
 * @returns ApiErrorResponse on error (400/401/404/500)
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
    // Parse and validate deckId from URL path
    const validationResult = deckIdSchema.safeParse(params.deckId);
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

    const deckId = validationResult.data;

    // Delete deck using service
    try {
      await deleteDeck(supabase, locals.user.id, deckId);
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
                message: "Failed to delete deck. Please try again.",
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
    console.error("Unexpected error in DELETE /api/decks/:deckId:", error);

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
