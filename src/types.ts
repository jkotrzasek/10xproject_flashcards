import type { Database } from "./db/database.types";

// ============================================================================
// Base Database Type Aliases
// ============================================================================

// Entity types (Row)
export type Deck = Database["public"]["Tables"]["decks"]["Row"];
export type Flashcard = Database["public"]["Tables"]["flashcards"]["Row"];
export type Generation = Database["public"]["Tables"]["generations"]["Row"];
export type GenerationError = Database["public"]["Tables"]["generation_error"]["Row"];

// Insert types
export type DeckInsert = Database["public"]["Tables"]["decks"]["Insert"];
export type FlashcardInsert = Database["public"]["Tables"]["flashcards"]["Insert"];
export type GenerationInsert = Database["public"]["Tables"]["generations"]["Insert"];
export type GenerationErrorInsert = Database["public"]["Tables"]["generation_error"]["Insert"];

// Update types
export type DeckUpdate = Database["public"]["Tables"]["decks"]["Update"];
export type FlashcardUpdate = Database["public"]["Tables"]["flashcards"]["Update"];
export type GenerationUpdate = Database["public"]["Tables"]["generations"]["Update"];
export type GenerationErrorUpdate = Database["public"]["Tables"]["generation_error"]["Update"];

// Enums
export type FlashcardSource = Database["public"]["Enums"]["flashcard_source"];
export type GenerationStatus = Database["public"]["Enums"]["generation_status"];
export type SpaceRepetitionStatus = Database["public"]["Enums"]["space_repetition_status"];

// ============================================================================
// Dtos (Data Transfer Objects) - Response Types
// ============================================================================

/**
 * Deck Dto - returned by GET /api/decks and GET /api/decks/:id
 * Based on decks.Row with computed flashcard_count, excluding user_id
 */
export type DeckDto = Omit<Deck, "user_id"> & {
  flashcard_count: number; // Computed field, not in DB
};

/**
 * Response for POST /api/decks
 */
export type DeckCreatedDto = Pick<Deck, "id">;

/**
 * Response for PATCH /api/decks/:id
 */
export type DeckUpdatedDto = Pick<Deck, "id" | "name">;

/**
 * Flashcard Dto - returned by GET /api/flashcards and GET /api/flashcards/:id
 * Maps to flashcards.Row, excluding user_id and generation_id
 */
export type FlashcardDto = Omit<Flashcard, "user_id" | "generation_id">;

/**
 * Response for POST /api/flashcards - simplified flashcard data
 */
export type FlashcardCreatedDto = Pick<Flashcard, "id" | "front" | "back">;

/**
 * Response for PATCH /api/flashcards/:id
 */
export type FlashcardUpdatedDto = Pick<Flashcard, "id" | "deck_id">;

/**
 * Flashcard data returned by GET /api/decks/:deckId/learn
 * Contains only fields necessary for learning session
 */
export type FlashcardLearnDto = Pick<Flashcard, "id" | "front" | "back">;

/**
 * Metadata for learn endpoint response
 */
export interface LearnMetaDto {
  total_due: number;
  returned: number;
  deck_total: number;
}

/**
 * Complete response for GET /api/decks/:deckId/learn
 */
export interface LearnResponseDto {
  data: FlashcardLearnDto[];
  meta: LearnMetaDto;
}

/**
 * Ephemeral flashcard proposal from AI generation
 * Not saved to database until user accepts
 */
export interface FlashcardProposalDto {
  front: string;
  back: string;
}

/**
 * Response for GET /api/generations/limit
 */
export interface GenerationLimitDto {
  daily_limit: number;
  used_today: number;
  remaining: number;
}

/**
 * Response for POST /api/generations
 * Includes ephemeral flashcard proposals
 */
export type GenerationResultDto = Pick<Generation, "session_id" | "status" | "generated_total"> & {
  flashcards_proposals: FlashcardProposalDto[];
};

/**
 * Response for GET /api/generations/:sessionId
 * Metadata only, no flashcard proposals (ephemeral)
 */
export type GenerationMetadataDto = Omit<Generation, "user_id">;

/**
 * Simplified generation data for GET /api/generations history
 */
export type GenerationHistoryItemDto = Pick<
  Generation,
  "session_id" | "created_at" | "updated_at" | "input_text_hash" | "input_text_length" | "generated_total" | "accepted_total"
>;

/**
 * Generation error data for admin endpoint
 */
export type GenerationErrorDto = Omit<GenerationError, "user_id">;

// ============================================================================
// Command Models - Request Types
// ============================================================================

/**
 * Request body for POST /api/decks
 * Validation: name 1-30 characters, unique per user
 */
export type CreateDeckCommand = Pick<DeckInsert, "name">;

/**
 * Request body for PATCH /api/decks/:id
 * Validation: name 1-30 characters, unique per user
 */
export type UpdateDeckCommand = Pick<DeckInsert, "name">;

/**
 * Single flashcard item in POST /api/flashcards request
 * Contains only content fields (front and back)
 * Validation: front max 200 chars, back max 500 chars
 */
export interface CreateFlashcardItemCommand {
  front: string;
  back: string;
}

/**
 * Request body for POST /api/flashcards
 * All flashcards in array share the same deck_id, source, and generation_id
 * Validation:
 * - deck_id: number, null, or undefined (null and undefined both mean unassigned)
 * - source: ai_full, ai_edited, or manual
 * - generation_id: required for ai_full, optional for ai_edited, null for manual
 * - flashcards: min 1 item in array
 */
export interface CreateFlashcardsCommand {
  deck_id?: number | null;
  source: FlashcardSource;
  generation_id: number | null;
  flashcards: CreateFlashcardItemCommand[]; // min 1 item
}

/**
 * Request body for PATCH /api/flashcards/:id
 * All fields optional, at least one must be provided
 * Validation: front max 200 chars, back max 500 chars
 */
export type UpdateFlashcardCommand = Partial<Pick<FlashcardInsert, "front" | "back" | "deck_id">>;

/**
 * Single review item in PATCH /api/learn/review payload
 * response must be 'OK' or 'NOK'
 */
export interface ReviewFlashcardItemCommand {
  flashcard_id: number;
  response: Extract<SpaceRepetitionStatus, "OK" | "NOK">;
}

/**
 * Request body for PATCH /api/learn/review
 * Validation: min 1 item in review array
 */
export interface ReviewFlashcardsCommand {
  review: ReviewFlashcardItemCommand[];
}

/**
 * Request body for POST /api/generations
 * Validation: input_text 1000-10000 characters
 */
export interface CreateGenerationCommand {
  input_text: string;
}

/**
 * Request body for PATCH /api/generations/:sessionId/accepted
 * Validation: accepted_total must be >= 0 and <= generated_total
 */
export type UpdateGenerationAcceptedCommand = Pick<GenerationInsert, "accepted_total">;

// ============================================================================
// Authentication - DTOs (Data Transfer Objects)
// ============================================================================

/**
 * User data returned after successful authentication
 */
export interface AuthUserDto {
  id: string;
  email: string;
}

/**
 * Response for POST /api/auth/login and POST /api/auth/register
 */
export interface AuthResponseDto {
  user: AuthUserDto;
  access_token?: string;
  refresh_token?: string;
}

/**
 * Standard auth error response
 */
export interface AuthErrorDto {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

// ============================================================================
// Authentication - Command Models (Request Types)
// ============================================================================

/**
 * Request body for POST /api/auth/login
 */
export interface LoginCommand {
  email: string;
  password: string;
}

/**
 * Request body for POST /api/auth/register
 */
export interface RegisterCommand {
  email: string;
  password: string;
  password_confirmation: string;
}

/**
 * Request body for POST /api/auth/forgot-password
 */
export interface ForgotPasswordCommand {
  email: string;
}

/**
 * Request body for POST /api/auth/reset-password
 */
export interface ResetPasswordCommand {
  new_password: string;
  new_password_confirmation: string;
  token?: string;
}

// ============================================================================
// Generic API Response Wrapper
// ============================================================================

/**
 * Standard API response wrapper for data responses
 */
export interface ApiResponse<T> {
  data: T;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: {
    message: string;
    code?: string;
  };
}
