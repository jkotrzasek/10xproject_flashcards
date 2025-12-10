import { z } from "zod";

/**
 * Valid response options for flashcard review
 */
export const reviewResponseOptions = ["OK", "NOK"] as const;

/**
 * Schema for GET /api/learn/:deckId path parameter
 * - Must be a positive integer
 * - Coerces string to number if possible
 */
export const deckIdParamSchema = z.coerce
  .number()
  .int("Deck ID must be an integer")
  .positive("Deck ID must be a positive number")
  .safe("Deck ID is out of safe integer range");

export type DeckIdParamInput = z.infer<typeof deckIdParamSchema>;

/**
 * Schema for GET /api/learn/:deckId query parameter
 * - limit: optional integer between 1 and 50, defaults to 50
 */
export const learnQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .min(1, "Limit must be at least 1")
    .max(100, "Limit must not exceed 100")
    .default(50),
});

export type LearnQueryInput = z.infer<typeof learnQuerySchema>;

/**
 * Schema for single review item in PATCH /api/learn/review
 * - flashcard_id: positive integer
 * - response: must be 'OK' or 'NOK'
 */
const reviewFlashcardItemSchema = z.object({
  flashcard_id: z.coerce
    .number()
    .int("Flashcard ID must be an integer")
    .positive("Flashcard ID must be a positive number")
    .safe("Flashcard ID is out of safe integer range"),
  response: z.enum(reviewResponseOptions),
});

/**
 * Schema for PATCH /api/learn/review
 * - review: array with at least 1 item, max 100 items
 */
export const reviewFlashcardsSchema = z.object({
  review: z
    .array(reviewFlashcardItemSchema)
    .min(1, "At least one review item is required")
    .max(100, "Maximum 100 review items allowed"),
});

export type ReviewFlashcardsInput = z.infer<typeof reviewFlashcardsSchema>;
