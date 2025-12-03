import type { APIRoute } from "astro";
import { createGenerationSchema } from "../../../lib/validation/generation.schema";
import {
  ensureDailyLimit,
  createPendingGeneration,
  finalizeGenerationSuccess,
  finalizeGenerationError,
  validateFlashcardProposals,
  generateFlashcards,
  GenerationErrorCodes,
  getGenerationHistory,
} from "../../../lib/services/generation.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import type { ApiResponse, GenerationResultDto, ApiErrorResponse, GenerationHistoryItemDto } from "../../../types";

export const prerender = false;

/**
 * User ID for MVP testing
 * TODO: Replace with actual authentication in future versions
 */
const USER_ID = DEFAULT_USER_ID;

/**
 * POST /api/generations
 * Generate flashcard proposals from input text using AI
 *
 * @requires Authentication (uses USER_ID constant for MVP)
 * @body CreateGenerationCommand { input_text: string }
 * @returns ApiResponse<GenerationResultDto> on success (200)
 * @returns ApiErrorResponse on error (400/401/429/500)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const supabase = locals.supabase;

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
    const validationResult = createGenerationSchema.safeParse(body);
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

    const { input_text } = validationResult.data;

    // Check daily generation limit
    try {
      await ensureDailyLimit(supabase, USER_ID);
    } catch (error) {
      if (error instanceof Error && error.message === GenerationErrorCodes.DAILY_LIMIT_EXCEEDED) {
        return new Response(
          JSON.stringify({
            error: {
              message: "Daily generation limit exceeded. Please try again tomorrow.",
              code: "DAILY_LIMIT_EXCEEDED",
            },
          } satisfies ApiErrorResponse),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    // Create pending generation record
    let sessionId: number;
    try {
      sessionId = await createPendingGeneration(supabase, USER_ID, input_text);
    } catch (error) {
      console.error("Failed to create pending generation:", error);
      return new Response(
        JSON.stringify({
          error: {
            message: "Failed to initialize generation. Please try again.",
            code: "DATABASE_ERROR",
          },
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate flashcards using AI (with internal 60s timeout)
    let flashcardProposals;
    try {
      flashcardProposals = await generateFlashcards(input_text);

      // Validate generated proposals
      if (!validateFlashcardProposals(flashcardProposals)) {
        throw new Error(GenerationErrorCodes.AI_RESPONSE_INVALID);
      }
    } catch (error) {
      // Determine error type and code
      let errorCode: string = GenerationErrorCodes.AI_GENERATION_ERROR;
      let errorMessage = "AI generation failed. Please try again later.";

      if (error instanceof Error) {
        // Map error codes to user-friendly messages
        if (error.message === GenerationErrorCodes.AI_TIMEOUT) {
          errorCode = GenerationErrorCodes.AI_TIMEOUT;
          errorMessage = "AI generation timed out. Please try again with shorter text.";
        } else if (error.message === GenerationErrorCodes.AI_RESPONSE_INVALID) {
          errorCode = GenerationErrorCodes.AI_RESPONSE_INVALID;
          errorMessage = "AI generated invalid flashcards. Please try again.";
        } else if (error.message === GenerationErrorCodes.AI_GENERATION_ERROR) {
          errorCode = GenerationErrorCodes.AI_GENERATION_ERROR;
          errorMessage = "AI generation failed. Please try again later.";
        }
      }

      // Log error details (without sensitive data)
      console.error(`Generation failed for session ${sessionId}:`, {
        errorCode,
        errorType: error instanceof Error ? error.name : "Unknown",
      });

      // Update generation record with error
      await finalizeGenerationError(supabase, sessionId, USER_ID, errorCode, errorMessage);

      return new Response(
        JSON.stringify({
          error: {
            message: errorMessage,
            code: errorCode,
          },
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Finalize generation with success
    try {
      await finalizeGenerationSuccess(supabase, sessionId, flashcardProposals.length);
    } catch (error) {
      console.error("Failed to finalize generation:", error);
      // TODO: Fix in future versions - generation record will remain in "pending" status
      // This creates orphaned pending records in database but MVP can tolerate this
      // Generation succeeded and flashcards were generated successfully, so we still return success
    }

    // Return successful response
    const response: ApiResponse<GenerationResultDto> = {
      data: {
        session_id: sessionId,
        status: "success",
        generated_total: flashcardProposals.length,
        flashcards_proposals: flashcardProposals,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in POST /api/generations:", error);

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
 * GET /api/generations
 * Get user"s generation history from last 30 days
 *
 * @requires Authentication (uses USER_ID constant for MVP)
 * @returns ApiResponse<GenerationHistoryItemDto[]> on success (200)
 * @returns ApiErrorResponse on error (500)
 */
export const GET: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;

  try {
    // Fetch generation history
    let history: GenerationHistoryItemDto[];
    try {
      history = await getGenerationHistory(supabase, USER_ID);
    } catch (error) {
      console.error("Error fetching generation history:", error);
      return new Response(
        JSON.stringify({
          error: {
            message: "Failed to fetch generation history. Please try again.",
            code: "DATABASE_ERROR",
          },
        } satisfies ApiErrorResponse),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return successful response (may be empty array)
    const response: ApiResponse<GenerationHistoryItemDto[]> = {
      data: history,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Catch-all for unexpected errors
    console.error("Unexpected error in GET /api/generations:", error);

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
