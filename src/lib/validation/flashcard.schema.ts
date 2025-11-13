import { z } from "zod";

/**
 * Valid sort options for GET /api/flashcards
 */
export const flashcardSortOptions = [
  "created_asc",
  "created_desc",
  "updated_asc",
  "updated_desc",
] as const;

export type FlashcardSortOption = (typeof flashcardSortOptions)[number];

/**
 * Valid flashcard source types
 */
export const flashcardSourceOptions = ["ai_full", "ai_edited", "manual"] as const;

/**
 * Valid space repetition status values
 */
export const spaceRepetitionStatusOptions = ["OK", "NOK", "not_checked"] as const;

/**
 * Schema for GET /api/flashcards query parameters
 * - deck_id: optional positive integer
 * - unassigned: optional boolean flag (only 'true' accepted)
 * - sort: optional sort parameter
 * - source: optional flashcard source filter
 * - space_repetition: optional space repetition status filter
 * 
 * Validation ensures deck_id and unassigned cannot be used together
 */
export const flashcardListQuerySchema = z
  .object({
    deck_id: z.coerce
      .number()
      .int("Deck ID must be an integer")
      .positive("Deck ID must be a positive number")
      .safe("Deck ID is out of safe integer range")
      .optional(),
    unassigned: z
      .string()
      .refine((val) => val === "true", {
        message: "Unassigned parameter must be 'true' if provided",
      })
      .transform(() => true)
      .optional(),
    sort: z.enum(flashcardSortOptions).optional(),
    source: z.enum(flashcardSourceOptions).optional(),
    space_repetition: z.enum(spaceRepetitionStatusOptions).optional(),
  })
  .refine(
    (data) => {
      // deck_id and unassigned cannot be used together
      return !(data.deck_id !== undefined && data.unassigned !== undefined);
    },
    {
      message: "Cannot use both deck_id and unassigned parameters together",
    }
  );

export type FlashcardListQueryInput = z.infer<typeof flashcardListQuerySchema>;

/**
 * Schema for GET /api/flashcards/:id and PATCH/DELETE /api/flashcards/:id
 * Validates flashcard ID parameter from URL
 * - Must be a positive integer
 * - Coerces string to number if possible
 */
export const flashcardIdSchema = z.coerce
  .number()
  .int("Flashcard ID must be an integer")
  .positive("Flashcard ID must be a positive number")
  .safe("Flashcard ID is out of safe integer range");

export type FlashcardIdInput = z.infer<typeof flashcardIdSchema>;

/**
 * Schema for single flashcard item in POST /api/flashcards
 * Validates only content fields (front and back)
 * - front: 1-200 characters after trim
 * - back: 1-500 characters after trim
 */
const createFlashcardItemSchema = z.object({
  front: z
    .string()
    .trim()
    .min(1, "Front text must not be empty")
    .max(200, "Front text must not exceed 200 characters"),
  back: z
    .string()
    .trim()
    .min(1, "Back text must not be empty")
    .max(500, "Back text must not exceed 500 characters"),
});

/**
 * Schema for POST /api/flashcards
 * All flashcards share the same deck_id, source, and generation_id
 * - deck_id: positive integer, null, or undefined (both null/undefined mean unassigned)
 * - source: one of ai_full, ai_edited, manual
 * - generation_id: required for ai_full, optional for ai_edited, null for manual
 * - flashcards: array with at least 1 item
 * 
 * Additional validation ensures generation_id rules are enforced per source
 */
export const createFlashcardsSchema = z
  .object({
    deck_id: z
      .number()
      .int("Deck ID must be an integer")
      .positive("Deck ID must be a positive number")
      .safe("Deck ID is out of safe integer range")
      .nullish(),
    source: z.enum(flashcardSourceOptions),
    generation_id: z
      .number()
      .int("Generation ID must be an integer")
      .positive("Generation ID must be a positive number")
      .safe("Generation ID is out of safe integer range")
      .nullable(),
    flashcards: z.array(createFlashcardItemSchema).min(1, "At least one flashcard is required"),
  })
  .refine(
    (data) => {
      // ai_full must have generation_id
      if (data.source === "ai_full" && data.generation_id === null) {
        return false;
      }
      // manual must have null generation_id
      if (data.source === "manual" && data.generation_id !== null) {
        return false;
      }
      // ai_edited can have either null or number (no validation needed)
      return true;
    },
    {
      message: "ai_full requires generation_id, manual must have null generation_id",
    }
  );

export type CreateFlashcardsInput = z.infer<typeof createFlashcardsSchema>;

/**
 * Schema for PATCH /api/flashcards/:id
 * All fields optional, at least one must be provided
 * - front: 1-200 characters after trim (optional)
 * - back: 1-500 characters after trim (optional)
 * - deck_id: positive integer or null (optional)
 */
export const updateFlashcardSchema = z
  .object({
    front: z
      .string()
      .trim()
      .min(1, "Front text must not be empty")
      .max(200, "Front text must not exceed 200 characters")
      .optional(),
    back: z
      .string()
      .trim()
      .min(1, "Back text must not be empty")
      .max(500, "Back text must not exceed 500 characters")
      .optional(),
    deck_id: z
      .number()
      .int("Deck ID must be an integer")
      .positive("Deck ID must be a positive number")
      .safe("Deck ID is out of safe integer range")
      .nullish(),
  })
  .refine(
    (data) => {
      // At least one field must be provided
      return data.front !== undefined || data.back !== undefined || data.deck_id !== undefined;
    },
    {
      message: "At least one field (front, back, or deck_id) must be provided",
    }
  );

export type UpdateFlashcardInput = z.infer<typeof updateFlashcardSchema>;

