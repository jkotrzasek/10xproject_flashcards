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

/**
 * Daily generation limit per user
 */
const DAILY_GENERATION_LIMIT = import.meta.env.DAILY_GENERATION_LIMIT;

/**
 * AI model identifier
 * TODO: In future version, this can be replaced with model selection from openRouter
 */
const AI_MODEL = "gpt-4o-mini";

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
    console.error("Error fetching daily generations count:", error);
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
    console.error("Error checking duplicate generation:", error);
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

  const generationData: GenerationInsert = {
    user_id: userId,
    input_text_hash: inputHash,
    input_text_length: inputLength,
    model: AI_MODEL,
    status: "pending",
    generated_total: 0,
    accepted_total: 0,
  };

  const { data, error } = await supabase.from("generations").insert(generationData).select("session_id").single();

  if (error) {
    console.error("Error creating pending generation:", error);
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
    console.error("Error finalizing generation success:", error);
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
    console.error("Error updating generation to error status:", updateError);
    throw new Error("Failed to update generation status");
  }

  // Create error record
  const errorData: GenerationErrorInsert = {
    session_id: sessionId,
    user_id: userId,
    error_code: errorCode,
    message: errorMessage,
  };

  const { error: insertError } = await supabase.from("generation_error").insert(errorData);

  if (insertError) {
    console.error("Error creating generation error record:", insertError);
    // Don't throw here - generation status is already updated
  }
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
 * AI Generation timeout in milliseconds
 */
const AI_TIMEOUT_MS = 60000; // 60 seconds

/**
 * Padding text for mock flashcard back content (100 characters)
 */
const MOCK_PADDING = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut.";

/**
 * Generate flashcards from input text using AI
 * Currently returns mocked data for MVP development
 * Timeout is handled internally (60s)
 *
 * @param inputText - Source text to generate flashcards from
 * @returns Array of flashcard proposals
 * @throws Error if generation fails or times out
 */
export const generateFlashcards = async (inputText: string): Promise<FlashcardProposalDto[]> => {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), AI_TIMEOUT_MS);

  try {
    if (timeoutController.signal.aborted) {
      throw new Error("Generation aborted");
    }

    // TODO: Replace with actual AI API call
    const mockFlashcards = await generateMockFlashcards(inputText, timeoutController.signal);

    return mockFlashcards;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message === "Generation aborted") {
        throw new Error("AI_TIMEOUT");
      }
      throw error;
    }
    throw new Error("AI_GENERATION_ERROR");
  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * Generate mock flashcards for development/testing
 * Simulates AI generation with realistic delay
 */
const generateMockFlashcards = async (inputText: string, signal: AbortSignal): Promise<FlashcardProposalDto[]> => {
  // Simulate realistic AI processing delay (1-3 seconds)
  const delay = 1000 + Math.random() * 2000;

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => resolve(), delay);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(new Error("Generation aborted"));
      },
      { once: true }
    );
  });

  if (signal.aborted) {
    throw new Error("Generation aborted");
  }

  const mockFlashcards: FlashcardProposalDto[] = [];

  for (let i = 1; i <= 10; i++) {
    mockFlashcards.push({
      front: `MockFront${i}`,
      back: `MockBack${i} ${MOCK_PADDING}`,
    });
  }

  return mockFlashcards;
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
    console.error("Error fetching generation metadata:", error);
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
    console.error("Error fetching generation history:", error);
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
    console.error("Error fetching generation for update:", fetchError);
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
    console.error("Error updating accepted_total:", updateError);
    throw new Error("DATABASE_ERROR");
  }
};
