import type { APIRoute } from "astro";
import { generationSessionIdSchema } from "../../../../lib/validation/generation.schema";
import { getGenerationMetadata } from "../../../../lib/services/generation.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import type { ApiResponse, GenerationMetadataDto, ApiErrorResponse } from "../../../../types";

export const prerender = false;

/**
 * User ID for MVP testing
 * TODO: Replace with actual authentication in future versions
 */
const USER_ID = DEFAULT_USER_ID;

/**
 * GET /api/generations/:sessionId
 * Get generation session metadata by ID
 *
 * @requires Authentication (uses USER_ID constant for MVP)
 * @param sessionId - Generation session ID from URL parameter
 * @returns ApiResponse<GenerationMetadataDto> on success (200)
 * @returns ApiErrorResponse on error (400/401/404/500)
 */
export const GET: APIRoute = async ({ params, locals }) => {
  const supabase = locals.supabase;

  try {
    // Validate sessionId parameter
    const validationResult = generationSessionIdSchema.safeParse(params.sessionId);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: firstError.message || "Invalid sessionId parameter",
            code: "INVALID_SESSION_ID",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sessionId = validationResult.data;

    // Fetch generation metadata
    let metadata: GenerationMetadataDto | null;
    try {
      metadata = await getGenerationMetadata(supabase, USER_ID, sessionId);
    } catch (error) {
      console.error("Error fetching generation metadata:", error);
      return new Response(
        JSON.stringify({
          error: {
            message: "Failed to fetch generation metadata. Please try again.",
            code: "DATABASE_ERROR",
          },
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check if generation exists for this user
    if (!metadata) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Generation session not found",
            code: "NOT_FOUND",
          },
        } satisfies ApiErrorResponse),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return successful response
    const response: ApiResponse<GenerationMetadataDto> = {
      data: metadata,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/generations/:sessionId:", error);

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
