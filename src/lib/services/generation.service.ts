import { createHash } from "crypto";
import type { SupabaseClient } from "../../db/supabase.client";
import type {
  GenerationInsert,
  GenerationErrorInsert,
  FlashcardProposalDto,
  GenerationMetadataDto,
  GenerationHistoryItemDto,
  GenerationLimitDto,
} from "../../types";
import { buildOpenRouterConfig } from "./openrouter.config";
import { OpenRouterService, OpenRouterServiceError } from "./openrouter.service";
import type { ChatMessage } from "./openrouter.service";
import {
  buildFlashcardResponseFormat,
  SYSTEM_PROMPT,
  buildUserPrompt,
  sanitizeAndTruncateInput,
} from "./openrouter.schemas";
import { DAILY_GENERATION_LIMIT } from "astro:env/server";

/**
 * Singleton instance of OpenRouterService
 * Initialized lazily on first use
 */
let openRouterServiceInstance: OpenRouterService | null = null;

/**
 * Get or create OpenRouterService singleton instance
 */
const getOpenRouterService = (): OpenRouterService => {
  if (!openRouterServiceInstance) {
    const config = buildOpenRouterConfig();
    openRouterServiceInstance = new OpenRouterService(config);
  }
  return openRouterServiceInstance;
};

/**
 * Error codes for generation failures
 */
export const GenerationErrorCodes = {
  AI_TIMEOUT: "AI_TIMEOUT",
  AI_RESPONSE_INVALID: "AI_RESPONSE_INVALID",
  AI_GENERATION_ERROR: "AI_GENERATION_ERROR",
  DAILY_LIMIT_EXCEEDED: "DAILY_LIMIT_EXCEEDED",
  DUPLICATE_GENERATION: "DUPLICATE_GENERATION",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

/**
 * Calculate MD5 hash of input text
 */
export const calculateHash = (text: string): string => {
  return createHash("md5").update(text, "utf8").digest("hex");
};

/**
 * Get count of generations created today by user
 */
export const getDailyGenerationsCount = async (supabase: SupabaseClient, userId: string): Promise<number> => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const { count, error } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", todayISO);

  if (error) {
    throw new Error("Failed to check daily limit");
  }

  return count ?? 0;
};

/**
 * Retrieve daily generation usage metadata for the given user.
 */
export const getDailyGenerationLimitsMetadata = async (
  supabase: SupabaseClient,
  userId: string
): Promise<GenerationLimitDto> => {
  const count = await getDailyGenerationsCount(supabase, userId);

  return {
    daily_limit: DAILY_GENERATION_LIMIT,
    used_today: count,
    remaining: Math.max(DAILY_GENERATION_LIMIT - count, 0),
  };
};

/**
 * Check if user has exceeded daily generation limit
 * @throws Error if limit exceeded
 */
export const ensureDailyLimit = async (supabase: SupabaseClient, userId: string): Promise<void> => {
  const count = await getDailyGenerationsCount(supabase, userId);

  if (count >= DAILY_GENERATION_LIMIT) {
    throw new Error(GenerationErrorCodes.DAILY_LIMIT_EXCEEDED);
  }
};

/**
 * Check if generation with same input hash already exists for user
 * @returns session_id if duplicate found, null otherwise
 */
export const checkDuplicateGeneration = async (
  supabase: SupabaseClient,
  userId: string,
  inputHash: string
): Promise<number | null> => {
  const { data, error } = await supabase
    .from("generations")
    .select("session_id")
    .eq("user_id", userId)
    .eq("input_text_hash", inputHash)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows returned, which is expected
    throw new Error("Failed to check for duplicates");
  }

  return data?.session_id ?? null;
};

/**
 * Create pending generation record
 * @returns session_id of created generation
 */
export const createPendingGeneration = async (
  supabase: SupabaseClient,
  userId: string,
  inputText: string
): Promise<number> => {
  const inputHash = calculateHash(inputText);
  const inputLength = Buffer.byteLength(inputText, "utf8");

  // Get model name from OpenRouter service
  const openRouterService = getOpenRouterService();
  const model = openRouterService.getDefaultModel();

  const generationData: GenerationInsert = {
    user_id: userId,
    input_text_hash: inputHash,
    input_text_length: inputLength,
    model,
    status: "pending",
    generated_total: 0,
    accepted_total: 0,
  };

  const { data, error } = await supabase.from("generations").insert(generationData).select("session_id").single();

  if (error) {
    throw new Error("Failed to create generation record");
  }

  if (!data) {
    throw new Error("Generation record created but no session_id returned");
  }

  return data.session_id;
};

/**
 * Finalize generation with success status
 */
export const finalizeGenerationSuccess = async (
  supabase: SupabaseClient,
  sessionId: number,
  generatedTotal: number
): Promise<void> => {
  const { error } = await supabase
    .from("generations")
    .update({
      status: "success",
      generated_total: generatedTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (error) {
    throw new Error("Failed to update generation status");
  }
};

/**
 * Finalize generation with error status and create error record
 */
export const finalizeGenerationError = async (
  supabase: SupabaseClient,
  sessionId: number,
  userId: string,
  errorCode: string,
  errorMessage: string
): Promise<void> => {
  // Update generation status to error
  const { error: updateError } = await supabase
    .from("generations")
    .update({
      status: "error",
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (updateError) {
    throw new Error("Failed to update generation status");
  }

  // Create error record
  const errorData: GenerationErrorInsert = {
    session_id: sessionId,
    user_id: userId,
    error_code: errorCode,
    message: errorMessage,
  };

  await supabase.from("generation_error").insert(errorData);
};

/**
 * Validate flashcard proposals
 * Ensures front/back text meet length requirements
 */
export const validateFlashcardProposals = (proposals: FlashcardProposalDto[]): boolean => {
  return proposals.every(
    (proposal) =>
      proposal.front.length > 0 &&
      proposal.front.length <= 200 &&
      proposal.back.length > 0 &&
      proposal.back.length <= 500
  );
};

/**
 * Calculate optimal number of flashcards based on input text length
 * Formula: min(50, max(15, floor(length / 150)))
 * - Short texts (1000-2000 chars): 15-20 flashcards
 * - Medium texts (3000-5000 chars): 20-33 flashcards
 * - Long texts (7000-10000 chars): 46-50 flashcards
 *
 * @param textLength - Length of input text in characters
 * @returns Optimal number of flashcards to generate (15-50)
 */
const calculateFlashcardCount = (textLength: number): number => {
  return Math.min(50, Math.max(10, Math.floor(textLength / 150)));
};

/**
 * Generate flashcards from input text using OpenRouter AI
 * Handles prompt building, API call, response parsing, and validation
 *
 * @param inputText - Source text to generate flashcards from
 * @returns Array of flashcard proposals
 * @throws Error with specific error codes if generation fails
 */
export const generateFlashcards = async (inputText: string): Promise<FlashcardProposalDto[]> => {
  try {
    // Sanitize and truncate input to prevent excessive token usage
    const sanitizedInput = sanitizeAndTruncateInput(inputText);

    if (!sanitizedInput || sanitizedInput.length === 0) {
      throw new Error(GenerationErrorCodes.AI_GENERATION_ERROR);
    }

    // Calculate optimal flashcard count based on text length
    const flashcardCount = calculateFlashcardCount(sanitizedInput.length);

    // Build messages array (system + user)
    const messages: ChatMessage[] = [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: buildUserPrompt(sanitizedInput, flashcardCount),
      },
    ];

    // Build JSON Schema response format
    const responseFormat = buildFlashcardResponseFormat();

    // Get OpenRouter service instance
    const openRouterService = getOpenRouterService();

    // Call OpenRouter API with schema
    const responseMessage = await openRouterService.createChatCompletionWithSchema(messages, responseFormat);

    // Parse JSON from response content
    const parsedResponse = parseFlashcardResponse(responseMessage.content);

    // Validate flashcard proposals
    if (!validateFlashcardProposals(parsedResponse)) {
      throw new Error(GenerationErrorCodes.AI_RESPONSE_INVALID);
    }

    return parsedResponse;
  } catch (error) {
    // Handle OpenRouterServiceError (already mapped to domain codes)
    if (error instanceof OpenRouterServiceError) {
      throw new Error(error.code);
    }

    // Handle known error codes
    if (error instanceof Error) {
      if ((Object.values(GenerationErrorCodes) as string[]).includes(error.message)) {
        throw error;
      }
    }

    // Unknown errors -> generic generation error
    throw new Error(GenerationErrorCodes.AI_GENERATION_ERROR);
  }
};

interface RawFlashcardResponse {
  flashcards?: unknown[];
}

interface RawFlashcard {
  front?: unknown;
  back?: unknown;
}

/**
 * Parse flashcard response JSON
 * @throws Error if JSON parsing fails or structure is invalid
 */
const parseFlashcardResponse = (content: string): FlashcardProposalDto[] => {
  try {
    const parsed: unknown = JSON.parse(content);

    // Validate response structure
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Response is not an object");
    }

    const response = parsed as RawFlashcardResponse;

    if (!Array.isArray(response.flashcards)) {
      throw new Error("Response does not contain flashcards array");
    }

    // Map to FlashcardProposalDto[]
    return response.flashcards.map((card) => {
      const rawCard = card as RawFlashcard;
      return {
        front: String(rawCard.front || ""),
        back: String(rawCard.back || ""),
      };
    });
  } catch {
    throw new Error(GenerationErrorCodes.AI_RESPONSE_INVALID);
  }
};

/**
 * Get generation metadata by session ID
 * Returns metadata without flashcard proposals (ephemeral data)
 * Filters by user_id to prevent unauthorized access
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID to filter by (security)
 * @param sessionId - Session ID of the generation
 * @returns Generation metadata or null if not found
 * @throws Error if database query fails
 */
export const getGenerationMetadata = async (
  supabase: SupabaseClient,
  userId: string,
  sessionId: number
): Promise<GenerationMetadataDto | null> => {
  const { data, error } = await supabase
    .from("generations")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .single();

  if (error) {
    // PGRST116 = no rows found, expected case
    if (error.code === "PGRST116") {
      return null;
    }
    throw new Error("Failed to fetch generation metadata");
  }

  if (!data) {
    return null;
  }

  // Map to DTO, excluding user_id
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...metadataDto } = data;
  return metadataDto as GenerationMetadataDto;
};

/**
 * Get generation history for user from last 30 days
 * Returns simplified data without proposals or full metadata
 * Limited to prevent large result sets
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID to filter by
 * @returns Array of generation history items (may be empty)
 * @throws Error if database query fails
 */
export const getGenerationHistory = async (
  supabase: SupabaseClient,
  userId: string
): Promise<GenerationHistoryItemDto[]> => {
  // Calculate 30 days ago timestamp
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  const { data, error } = await supabase
    .from("generations")
    .select("session_id, created_at, updated_at, input_text_hash, input_text_length, generated_total, accepted_total")
    .eq("user_id", userId)
    .gte("created_at", thirtyDaysAgoISO)
    .order("updated_at", { ascending: false })
    .limit(100); // Prevent DOS with large result sets

  if (error) {
    throw new Error("Failed to fetch generation history");
  }

  return data as GenerationHistoryItemDto[];
};

/**
 * Update accepted_total for a generation session
 * Validates business constraints before updating
 *
 * @param supabase - Authenticated Supabase client
 * @param userId - User ID to filter by (security)
 * @param sessionId - Session ID of the generation
 * @param acceptedTotal - New value for accepted_total
 * @throws Error if generation not found, validation fails, or database query fails
 */
export const updateGenerationAcceptedTotal = async (
  supabase: SupabaseClient,
  userId: string,
  sessionId: number,
  acceptedTotal: number
): Promise<void> => {
  // Fetch current generation record
  const { data: generation, error: fetchError } = await supabase
    .from("generations")
    .select("generated_total, accepted_total")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .single();

  if (fetchError) {
    if (fetchError.code === "PGRST116") {
      throw new Error("NOT_FOUND");
    }
    throw new Error("DATABASE_ERROR");
  }

  if (!generation) {
    throw new Error("NOT_FOUND");
  }

  // Validate business constraint: accepted_total <= generated_total
  if (acceptedTotal > generation.generated_total) {
    throw new Error("EXCEEDS_GENERATED_TOTAL");
  }

  // Update accepted_total and updated_at
  const { error: updateError } = await supabase
    .from("generations")
    .update({
      accepted_total: acceptedTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId)
    .eq("user_id", userId);

  if (updateError) {
    throw new Error("DATABASE_ERROR");
  }
};
