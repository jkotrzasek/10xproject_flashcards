import { z } from "zod";

/**
 * Schema for POST /api/decks and PATCH /api/decks/:id
 * Validates deck name
 * - Must be between 1 and 30 characters after trim
 * - Must not be empty after trim
 */
export const createDeckSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Deck name must be at least 1 character")
    .max(30, "Deck name must not exceed 30 characters"),
});

export type CreateDeckInput = z.infer<typeof createDeckSchema>;

/**
 * Schema for PATCH /api/decks/:id
 * Uses the same validation as create
 */
export const updateDeckSchema = createDeckSchema;

export type UpdateDeckInput = z.infer<typeof updateDeckSchema>;

/**
 * Schema for GET /api/decks/:deckId and DELETE /api/decks/:deckId
 * Validates deckId parameter from URL
 * - Must be a positive integer
 * - Coerces string to number if possible
 */
export const deckIdSchema = z.coerce
  .number()
  .int("Deck ID must be an integer")
  .positive("Deck ID must be a positive number")
  .safe("Deck ID is out of safe integer range");

export type DeckIdInput = z.infer<typeof deckIdSchema>;

/**
 * Valid sort options for GET /api/decks
 */
export const deckSortOptions = [
  "name_asc",
  "name_desc",
  "created_asc",
  "created_desc",
  "updated_asc",
  "updated_desc",
] as const;

export type DeckSortOption = (typeof deckSortOptions)[number];

/**
 * Schema for sort query parameter in GET /api/decks
 * Validates against allowed sort options
 */
export const deckSortSchema = z.enum(deckSortOptions).optional();

export type DeckSortInput = z.infer<typeof deckSortSchema>;

