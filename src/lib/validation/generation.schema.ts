import { z } from 'zod';

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
    .min(1000, 'Input text must be at least 1000 characters')
    .max(10000, 'Input text must not exceed 10000 characters')
});

export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;

