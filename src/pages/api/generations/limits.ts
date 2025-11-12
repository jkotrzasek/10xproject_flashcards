import type { APIRoute } from "astro";
import { getDailyGenerationLimitsMetadata } from "../../../lib/services/generation.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import type { ApiResponse, GenerationLimitDto, ApiErrorResponse } from "../../../types";

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
 * @returns ApiResponse<GenerationLimitDto> on success (200)
 * @returns ApiErrorResponse on error (400/401/500)
 */
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;

  try {
    // Fetch generation history
    let limitMetadata: GenerationLimitDto;
    try {
      limitMetadata = await getDailyGenerationLimitsMetadata(supabase, USER_ID);
    } catch (error) {
      console.error("Error fetching generation limits:", error);
      return new Response(
        JSON.stringify({
          error: {
            message: "Failed to fetch generation limits. Please try again.",
            code: "DATABASE_ERROR",
          },
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return successful response (may be empty array)
    const response: ApiResponse<GenerationLimitDto> = {
      data: limitMetadata,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/generations/limits:", error);

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
