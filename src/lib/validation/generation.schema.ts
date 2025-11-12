import { z } from "zod";

/**
 * Schema for POST /api/generations
 * Validates input text for flashcard generation
 * - Must be between 1000 and 10000 characters after trim
 * - Must not be empty after trim
 */
export const createGenerationSchema = z.object({
  input_text: z
    .string()
    .trim()
    .min(1000, "Input text must be at least 1000 characters")
    .max(10000, "Input text must not exceed 10000 characters"),
});

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;

/**
 * Schema for GET /api/generations/:sessionId
 * Validates sessionId parameter from URL
 * - Must be a positive integer (bigint range)
 * - Coerces string to number if possible
 */
export const generationSessionIdSchema = z.coerce
  .number()
  .int("Session ID must be an integer")
  .positive("Session ID must be a positive number")
  .safe("Session ID is out of safe integer range");

export type GenerationSessionIdInput = z.infer<typeof generationSessionIdSchema>;

/**
 * Schema for PATCH /api/generations/:sessionId/accepted
 * Validates accepted_total value
 * - Must be a non-negative integer
 */
export const updateGenerationAcceptedSchema = z
  .number()
  .int("Accepted total must be an integer")
  .nonnegative("Accepted total cannot be negative")
  .safe("Accepted total is out of safe integer range");

export type UpdateGenerationAcceptedInput = z.infer<typeof updateGenerationAcceptedSchema>;
