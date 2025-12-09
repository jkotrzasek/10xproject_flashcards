import type { APIRoute } from "astro";
import { createDeckSchema, deckSortSchema } from "../../../lib/validation/deck.schema";
import { createDeck, getDecks, DeckErrorCodes } from "../../../lib/services/deck.service";
import type { ApiResponse, DeckCreatedDto, DeckDto, ApiErrorResponse } from "../../../types";

export const prerender = false;

/**
 * GET /api/decks
 * Retrieve all decks for the authenticated user
 * 
 * @query sort - Optional sort parameter (name_asc, name_desc, created_asc, created_desc, updated_asc, updated_desc)
 * @returns ApiResponse<DeckDto[]> on success (200)
 * @returns ApiErrorResponse on error (400/401/500)
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
    // Parse and validate sort query parameter
    const url = new URL(request.url);
    const sortParam = url.searchParams.get("sort") ?? undefined;
    const validationResult = deckSortSchema.safeParse(sortParam);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Invalid sort parameter. Must be one of: name_asc, name_desc, created_asc, created_desc, updated_asc, updated_desc",
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sort = validationResult.data;

    // Retrieve decks using service
    let decks: DeckDto[];
    try {
      decks = await getDecks(supabase, locals.user.id, sort);
    } catch (error) {
      if (error instanceof Error && error.message === DeckErrorCodes.DATABASE_ERROR) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Failed to retrieve decks. Please try again.",
              code: "DATABASE_ERROR",
            },
          } satisfies ApiErrorResponse),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }

      // Unexpected error
      throw error;
    }

    // Return successful response
    const response: ApiResponse<DeckDto[]> = {
      data: decks,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/decks:", error);

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
 * POST /api/decks
 * Create a new deck for the authenticated user
 * 
 * @body CreateDeckCommand { name: string }
 * @returns ApiResponse<DeckCreatedDto> on success (200)
 * @returns ApiErrorResponse on error (400/401/409/500)
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
    const validationResult = createDeckSchema.safeParse(body);
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

    const { name } = validationResult.data;

    // Create deck using service
    let createdDeck: DeckCreatedDto;
    try {
      createdDeck = await createDeck(supabase, locals.user.id, name);
    } catch (error) {
      if (error instanceof Error) {
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
                message: "Failed to create deck. Please try again.",
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
    const response: ApiResponse<DeckCreatedDto> = {
      data: createdDeck,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/decks:", error);

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

