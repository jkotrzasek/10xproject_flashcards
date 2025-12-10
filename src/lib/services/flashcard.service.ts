import type { SupabaseClient } from "../../db/supabase.client";
import type {
  FlashcardDto,
  FlashcardCreatedDto,
  FlashcardUpdatedDto,
  CreateFlashcardItemCommand,
  UpdateFlashcardCommand,
  FlashcardInsert,
  FlashcardUpdate,
  FlashcardSource,
  SpaceRepetitionStatus,
} from "../../types";
import type { FlashcardSortOption } from "../validation/flashcard.schema";
import { getDeckById, DeckErrorCodes } from "./deck.service";

/**
 * Domain error codes for flashcard operations
 */
export const FlashcardErrorCodes = {
  FLASHCARD_NOT_FOUND: "FLASHCARD_NOT_FOUND",
  FLASHCARD_DECK_NOT_FOUND: "FLASHCARD_DECK_NOT_FOUND",
  FLASHCARD_GENERATION_NOT_FOUND: "FLASHCARD_GENERATION_NOT_FOUND",
  FLASHCARD_SOURCE_CONFLICT: "FLASHCARD_SOURCE_CONFLICT",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

/**
 * List flashcards with optional filtering and sorting
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcards
 * @param options - Filtering and sorting options
 * @returns Array of flashcards matching filters
 * @throws Error with FlashcardErrorCodes.FLASHCARD_DECK_NOT_FOUND if deck doesn't exist or doesn't belong to user
 * @throws Error with FlashcardErrorCodes.DATABASE_ERROR on database errors
 */
export async function listFlashcards(
  supabase: SupabaseClient,
  userId: string,
  options: {
    deckId?: number;
    unassigned?: boolean;
    sort?: FlashcardSortOption;
    source?: FlashcardSource;
    spaceRepetition?: SpaceRepetitionStatus;
  } = {}
): Promise<FlashcardDto[]> {
  try {
    // Verify deck exists if filtering by deck_id
    if (options.deckId !== undefined) {
      try {
        await getDeckById(supabase, userId, options.deckId);
      } catch (error) {
        if (error instanceof Error && error.message === DeckErrorCodes.DECK_NOT_FOUND) {
          throw new Error(FlashcardErrorCodes.FLASHCARD_DECK_NOT_FOUND);
        }
        throw error;
      }
    }

    // Build query
    let query = supabase
      .from("flashcards")
      .select("id, deck_id, source, front, back, space_repetition, last_repetition, created_at, updated_at")
      .eq("user_id", userId);

    // Apply filters
    if (options.deckId !== undefined) {
      query = query.eq("deck_id", options.deckId);
    }

    if (options.unassigned === true) {
      query = query.is("deck_id", null);
    }

    if (options.source !== undefined) {
      query = query.eq("source", options.source);
    }

    if (options.spaceRepetition !== undefined) {
      query = query.eq("space_repetition", options.spaceRepetition);
    }

    // Apply sorting (default: most recently updated first)
    const sortOption = options.sort ?? "updated_desc";
    switch (sortOption) {
      case "created_asc":
        query = query.order("created_at", { ascending: true });
        break;
      case "created_desc":
        query = query.order("created_at", { ascending: false });
        break;
      case "updated_asc":
        query = query.order("updated_at", { ascending: true });
        break;
      case "updated_desc":
        query = query.order("updated_at", { ascending: false });
        break;
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error in listFlashcards:", error);
      throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      return [];
    }

    // Map to FlashcardDto format (already excludes user_id and generation_id from select)
    const flashcards: FlashcardDto[] = data.map((flashcard) => ({
      id: flashcard.id,
      deck_id: flashcard.deck_id,
      source: flashcard.source,
      front: flashcard.front,
      back: flashcard.back,
      space_repetition: flashcard.space_repetition,
      last_repetition: flashcard.last_repetition,
      created_at: flashcard.created_at,
      updated_at: flashcard.updated_at,
    }));

    return flashcards;
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(FlashcardErrorCodes).includes(error.message as any)) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error("Unexpected error in listFlashcards:", error);
    throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Retrieve a single flashcard by ID
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcard
 * @param flashcardId - Flashcard ID to retrieve
 * @returns Flashcard data
 * @throws Error with FlashcardErrorCodes.FLASHCARD_NOT_FOUND if flashcard doesn't exist or doesn't belong to user
 * @throws Error with FlashcardErrorCodes.DATABASE_ERROR on database errors
 */
export async function getFlashcardById(
  supabase: SupabaseClient,
  userId: string,
  flashcardId: number
): Promise<FlashcardDto> {
  try {
    const { data, error } = await supabase
      .from("flashcards")
      .select("id, deck_id, source, front, back, space_repetition, last_repetition, created_at, updated_at")
      .eq("user_id", userId)
      .eq("id", flashcardId)
      .single();

    if (error) {
      // Handle "not found" case (PGRST116 is PostgREST code for no rows)
      if (error.code === "PGRST116") {
        throw new Error(FlashcardErrorCodes.FLASHCARD_NOT_FOUND);
      }

      console.error("Database error in getFlashcardById:", error);
      throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      throw new Error(FlashcardErrorCodes.FLASHCARD_NOT_FOUND);
    }

    // Map to FlashcardDto format
    const flashcard: FlashcardDto = {
      id: data.id,
      deck_id: data.deck_id,
      source: data.source,
      front: data.front,
      back: data.back,
      space_repetition: data.space_repetition,
      last_repetition: data.last_repetition,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return flashcard;
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(FlashcardErrorCodes).includes(error.message as any)) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error("Unexpected error in getFlashcardById:", error);
    throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Create multiple flashcards
 * All flashcards share the same deck_id, source, and generation_id
 * Validates deck ownership and generation ownership before creating
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcards
 * @param deckId - Deck ID for all flashcards (number, null, or undefined for unassigned)
 * @param source - Source type for all flashcards
 * @param generationId - Generation ID for all flashcards (or null)
 * @param flashcards - Array of flashcard content (front/back only)
 * @returns Array of created flashcards with IDs
 * @throws Error with FlashcardErrorCodes.FLASHCARD_DECK_NOT_FOUND if deck doesn't exist or doesn't belong to user
 * @throws Error with FlashcardErrorCodes.FLASHCARD_GENERATION_NOT_FOUND if generation doesn't exist or doesn't belong to user
 * @throws Error with FlashcardErrorCodes.DATABASE_ERROR on database errors
 */
export async function createFlashcards(
  supabase: SupabaseClient,
  userId: string,
  deckId: number | null | undefined,
  source: FlashcardSource,
  generationId: number | null,
  flashcards: CreateFlashcardItemCommand[]
): Promise<FlashcardCreatedDto[]> {
  try {
    // Validate deck exists and belongs to user if deck_id is provided (not null/undefined)
    if (deckId !== null && deckId !== undefined) {
      try {
        await getDeckById(supabase, userId, deckId);
      } catch (error) {
        if (error instanceof Error && error.message === DeckErrorCodes.DECK_NOT_FOUND) {
          throw new Error(FlashcardErrorCodes.FLASHCARD_DECK_NOT_FOUND);
        }
        throw error;
      }
    }

    // Validate generation exists and belongs to user if generation_id is provided
    if (generationId !== null) {
      const { data: generation, error: generationError } = await supabase
        .from("generations")
        .select("session_id")
        .eq("user_id", userId)
        .eq("session_id", generationId)
        .single();

      if (generationError) {
        // Handle "not found" case
        if (generationError.code === "PGRST116") {
          throw new Error(FlashcardErrorCodes.FLASHCARD_GENERATION_NOT_FOUND);
        }
        console.error("Database error in createFlashcards (generation validation):", generationError);
        throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
      }

      if (!generation) {
        throw new Error(FlashcardErrorCodes.FLASHCARD_GENERATION_NOT_FOUND);
      }
    }

    // Prepare flashcard data for insertion (all share the same deck_id, source, generation_id)
    // Convert undefined to null for database consistency
    const flashcardsToInsert: FlashcardInsert[] = flashcards.map((flashcard) => ({
      user_id: userId,
      deck_id: deckId ?? null,
      front: flashcard.front,
      back: flashcard.back,
      source: source,
      generation_id: generationId,
    }));

    // Insert flashcards and return created data
    const { data, error } = await supabase.from("flashcards").insert(flashcardsToInsert).select("id, front, back");

    if (error) {
      console.error("Database error in createFlashcards (insert):", error);
      throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
    }

    if (!data || data.length === 0) {
      console.error("No data returned from createFlashcards insert");
      throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
    }

    // Map to FlashcardCreatedDto format
    const createdFlashcards: FlashcardCreatedDto[] = data.map((flashcard) => ({
      id: flashcard.id,
      front: flashcard.front,
      back: flashcard.back,
    }));

    return createdFlashcards;
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(FlashcardErrorCodes).includes(error.message as any)) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error("Unexpected error in createFlashcards:", error);
    throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Update a flashcard
 * Validates deck ownership if changing deck
 * Automatically changes source from ai_full to ai_edited when content is modified
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcard
 * @param flashcardId - Flashcard ID to update
 * @param updates - Fields to update (front, back, and/or deck_id)
 * @returns Updated flashcard data with id and deck_id
 * @throws Error with FlashcardErrorCodes.FLASHCARD_NOT_FOUND if flashcard doesn't exist or doesn't belong to user
 * @throws Error with FlashcardErrorCodes.FLASHCARD_DECK_NOT_FOUND if new deck doesn't exist or doesn't belong to user
 * @throws Error with FlashcardErrorCodes.DATABASE_ERROR on database errors
 */
export async function updateFlashcard(
  supabase: SupabaseClient,
  userId: string,
  flashcardId: number,
  updates: UpdateFlashcardCommand
): Promise<FlashcardUpdatedDto> {
  try {
    // First, fetch the current flashcard to verify ownership and get current state
    const { data: currentFlashcard, error: fetchError } = await supabase
      .from("flashcards")
      .select("id, source, deck_id")
      .eq("user_id", userId)
      .eq("id", flashcardId)
      .single();

    if (fetchError) {
      // Handle "not found" case
      if (fetchError.code === "PGRST116") {
        throw new Error(FlashcardErrorCodes.FLASHCARD_NOT_FOUND);
      }
      console.error("Database error in updateFlashcard (fetch):", fetchError);
      throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
    }

    if (!currentFlashcard) {
      throw new Error(FlashcardErrorCodes.FLASHCARD_NOT_FOUND);
    }

    // Validate new deck if deck_id is being changed to a number (not null/undefined)
    if (updates.deck_id !== undefined && updates.deck_id !== null) {
      try {
        await getDeckById(supabase, userId, updates.deck_id);
      } catch (error) {
        if (error instanceof Error && error.message === DeckErrorCodes.DECK_NOT_FOUND) {
          throw new Error(FlashcardErrorCodes.FLASHCARD_DECK_NOT_FOUND);
        }
        throw error;
      }
    }

    // Prepare update object
    const updateData: Partial<FlashcardUpdate> = {};

    // Add fields that are being updated
    if (updates.front !== undefined) {
      updateData.front = updates.front;
    }
    if (updates.back !== undefined) {
      updateData.back = updates.back;
    }
    if (updates.deck_id !== undefined) {
      updateData.deck_id = updates.deck_id;
    }

    // Auto-update source from ai_full to ai_edited if content changes
    if (currentFlashcard.source === "ai_full" && (updates.front !== undefined || updates.back !== undefined)) {
      updateData.source = "ai_edited";
    }

    // Perform update
    const { data, error } = await supabase
      .from("flashcards")
      .update(updateData)
      .eq("user_id", userId)
      .eq("id", flashcardId)
      .select("id, deck_id")
      .single();

    if (error) {
      // Handle "not found" case (shouldn't happen as we verified above, but handle it)
      if (error.code === "PGRST116") {
        throw new Error(FlashcardErrorCodes.FLASHCARD_NOT_FOUND);
      }
      console.error("Database error in updateFlashcard (update):", error);
      throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      throw new Error(FlashcardErrorCodes.FLASHCARD_NOT_FOUND);
    }

    // Return FlashcardUpdatedDto
    return {
      id: data.id,
      deck_id: data.deck_id,
    };
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(FlashcardErrorCodes).includes(error.message as any)) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error("Unexpected error in updateFlashcard:", error);
    throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Delete a flashcard
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the flashcard
 * @param flashcardId - Flashcard ID to delete
 * @throws Error with FlashcardErrorCodes.FLASHCARD_NOT_FOUND if flashcard doesn't exist or doesn't belong to user
 * @throws Error with FlashcardErrorCodes.DATABASE_ERROR on database errors
 */
export async function deleteFlashcard(supabase: SupabaseClient, userId: string, flashcardId: number): Promise<void> {
  try {
    const { error, count } = await supabase
      .from("flashcards")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("id", flashcardId);

    if (error) {
      console.error("Database error in deleteFlashcard:", error);
      throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
    }

    // If count is 0, flashcard was not found or doesn't belong to user
    if (count === 0) {
      throw new Error(FlashcardErrorCodes.FLASHCARD_NOT_FOUND);
    }
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(FlashcardErrorCodes).includes(error.message as any)) {
      throw error;
    }

    // Log and wrap unexpected errors
    console.error("Unexpected error in deleteFlashcard:", error);
    throw new Error(FlashcardErrorCodes.DATABASE_ERROR);
  }
}
