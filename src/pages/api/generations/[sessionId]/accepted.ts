import type { APIRoute } from "astro";
import { generationSessionIdSchema, updateGenerationAcceptedSchema } from "../../../../lib/validation/generation.schema";
import { updateGenerationAcceptedTotal } from "../../../../lib/services/generation.service";
import { DEFAULT_USER_ID } from "../../../../db/supabase.client";
import type { ApiErrorResponse } from "../../../../types";

export const prerender = false;

/**
 * User ID for MVP testing
 * TODO: Replace with actual authentication in future versions
 */
const USER_ID = DEFAULT_USER_ID;

/**
 * PATCH /api/generations/:sessionId/accepted
 * Update accepted_total for a generation session
 *
 * @requires Authentication (uses USER_ID constant for MVP)
 * @param sessionId - Generation session ID from URL parameter
 * @body { accepted_total: number } - New accepted count (must be >= 0 and <= generated_total)
 * @returns Empty response on success (200)
 * @returns ApiErrorResponse on error (400/401/404/500)
 */
export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const supabase = locals.supabase;

  try {
    // Validate sessionId parameter
    const sessionIdValidation = generationSessionIdSchema.safeParse(params.sessionId);
    if (!sessionIdValidation.success) {
      const firstError = sessionIdValidation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: `${firstError.message} for sessionId` || "Invalid sessionId parameter",
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const sessionId = sessionIdValidation.data;

    // Parse request body
    let body: any;
    try {
      body = await request.json();
    } catch (error) {
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

    // Check if accepted_total field exists
    if (body.accepted_total === undefined) {
      return new Response(
        JSON.stringify({
          error: {
            message: "Missing required field: accepted_total",
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Validate accepted_total field
    const acceptedTotalValidation = updateGenerationAcceptedSchema.safeParse(body.accepted_total);
    if (!acceptedTotalValidation.success) {
      const firstError = acceptedTotalValidation.error.errors[0];
      return new Response(
        JSON.stringify({
          error: {
            message: `${firstError.message} for accepted_total` || "Invalid accepted_total value",
            code: "INVALID_INPUT",
          },
        } satisfies ApiErrorResponse),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const accepted_total = acceptedTotalValidation.data;

    // Update accepted total via service
    try {
      await updateGenerationAcceptedTotal(supabase, USER_ID, sessionId, accepted_total);
    } catch (error) {
      if (error instanceof Error) {
        // Handle specific business logic errors
        if (error.message === "NOT_FOUND") {
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

        if (error.message === "EXCEEDS_GENERATED_TOTAL") {
          return new Response(
            JSON.stringify({
              error: {
                message: "Accepted total cannot exceed generated total",
                code: "EXCEEDS_GENERATED_TOTAL",
              },
            } satisfies ApiErrorResponse),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }

        if (error.message === "DATABASE_ERROR") {
          return new Response(
            JSON.stringify({
              error: {
                message: "Failed to update generation. Please try again.",
                code: "DATABASE_ERROR",
              },
            } satisfies ApiErrorResponse),
            { status: 500, headers: { "Content-Type": "application/json" } }
          );
        }
      }

      // Unexpected error
      console.error("Unexpected error in PATCH /api/generations/:sessionId/accepted:", error);
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

    // Success - return empty response with 200 status
    return new Response(null, { status: 200 });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in PATCH /api/generations/:sessionId/accepted:", error);

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

