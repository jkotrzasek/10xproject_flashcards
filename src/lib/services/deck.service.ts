import type { SupabaseClient } from "../../db/supabase.client";
import type { DeckDto, DeckCreatedDto, DeckUpdatedDto, DeckInsert } from "../../types";
import type { DeckSortOption } from "../validation/deck.schema";

/**
 * Domain error codes for deck operations
 */
export const DeckErrorCodes = {
  DECK_NOT_FOUND: "DECK_NOT_FOUND",
  DECK_NAME_CONFLICT: "DECK_NAME_CONFLICT",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

/**
 * Creates a new deck for the user
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the deck
 * @param name - Deck name (already validated and trimmed)
 * @returns Created deck ID
 * @throws Error with DeckErrorCodes.DECK_NAME_CONFLICT if name already exists for user
 * @throws Error with DeckErrorCodes.DATABASE_ERROR for other database errors
 */
export async function createDeck(
  supabase: SupabaseClient,
  userId: string,
  name: string
): Promise<DeckCreatedDto> {
  try {
    const deckData: DeckInsert = {
      user_id: userId,
      name: name,
    };

    const { data, error } = await supabase
      .from("decks")
      .insert(deckData)
      .select("id")
      .single();

    if (error) {
      // Check for unique constraint violation (duplicate name)
      if (error.code === "23505") {
        throw new Error(DeckErrorCodes.DECK_NAME_CONFLICT);
      }
      
      console.error("Database error in createDeck:", error);
      throw new Error(DeckErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      console.error("No data returned from createDeck insert");
      throw new Error(DeckErrorCodes.DATABASE_ERROR);
    }

    return { id: data.id };
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(DeckErrorCodes).includes(error.message as any)) {
      throw error;
    }
    
    // Log and wrap unexpected errors
    console.error("Unexpected error in createDeck:", error);
    throw new Error(DeckErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Retrieves all decks for a user with optional sorting
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the decks
 * @param sort - Optional sort parameter
 * @returns Array of decks with flashcard count
 * @throws Error with DeckErrorCodes.DATABASE_ERROR on database errors
 */
export async function getDecks(
  supabase: SupabaseClient,
  userId: string,
  sort?: DeckSortOption
): Promise<DeckDto[]> {
  try {
    let query = supabase
      .from("decks")
      .select("id, name, created_at, updated_at, flashcards(count)")
      .eq("user_id", userId);

    // Apply sorting based on sort parameter
    if (sort) {
      switch (sort) {
        case "name_asc":
          query = query.order("name", { ascending: true });
          break;
        case "name_desc":
          query = query.order("name", { ascending: false });
          break;
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
    } else {
      // Default sorting: most recently updated first
      query = query.order("updated_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database error in getDecks:", error);
      throw new Error(DeckErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      return [];
    }

    // Map to DeckDto format, extracting flashcard count from aggregation
    const decks: DeckDto[] = data.map((deck) => ({
      id: deck.id,
      name: deck.name,
      created_at: deck.created_at,
      updated_at: deck.updated_at,
      flashcard_count: Array.isArray(deck.flashcards) ? deck.flashcards[0]?.count ?? 0 : 0,
    }));

    return decks;
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(DeckErrorCodes).includes(error.message as any)) {
      throw error;
    }
    
    // Log and wrap unexpected errors
    console.error("Unexpected error in getDecks:", error);
    throw new Error(DeckErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Retrieves a single deck by ID
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the deck
 * @param deckId - Deck ID to retrieve
 * @returns Deck with flashcard count
 * @throws Error with DeckErrorCodes.DECK_NOT_FOUND if deck doesn't exist or doesn't belong to user
 * @throws Error with DeckErrorCodes.DATABASE_ERROR on database errors
 */
export async function getDeckById(
  supabase: SupabaseClient,
  userId: string,
  deckId: number
): Promise<DeckDto> {
  try {
    const { data, error } = await supabase
      .from("decks")
      .select("id, name, created_at, updated_at, flashcards(count)")
      .eq("user_id", userId)
      .eq("id", deckId)
      .single();

    if (error) {
      // Handle "not found" case (PGRST116 is PostgREST code for no rows)
      if (error.code === "PGRST116") {
        throw new Error(DeckErrorCodes.DECK_NOT_FOUND);
      }
      
      console.error("Database error in getDeckById:", error);
      throw new Error(DeckErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      throw new Error(DeckErrorCodes.DECK_NOT_FOUND);
    }

    // Map to DeckDto format, extracting flashcard count from aggregation
    const deck: DeckDto = {
      id: data.id,
      name: data.name,
      created_at: data.created_at,
      updated_at: data.updated_at,
      flashcard_count: Array.isArray(data.flashcards) ? data.flashcards[0]?.count ?? 0 : 0,
    };

    return deck;
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(DeckErrorCodes).includes(error.message as any)) {
      throw error;
    }
    
    // Log and wrap unexpected errors
    console.error("Unexpected error in getDeckById:", error);
    throw new Error(DeckErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Updates deck name
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the deck
 * @param deckId - Deck ID to update
 * @param name - New deck name (already validated and trimmed)
 * @returns Updated deck ID and name
 * @throws Error with DeckErrorCodes.DECK_NOT_FOUND if deck doesn't exist or doesn't belong to user
 * @throws Error with DeckErrorCodes.DECK_NAME_CONFLICT if new name already exists for user
 * @throws Error with DeckErrorCodes.DATABASE_ERROR on database errors
 */
export async function updateDeckName(
  supabase: SupabaseClient,
  userId: string,
  deckId: number,
  name: string
): Promise<DeckUpdatedDto> {
  try {
    const { data, error } = await supabase
      .from("decks")
      .update({ name })
      .eq("user_id", userId)
      .eq("id", deckId)
      .select("id, name")
      .single();

    if (error) {
      // Check for unique constraint violation (duplicate name)
      if (error.code === "23505") {
        throw new Error(DeckErrorCodes.DECK_NAME_CONFLICT);
      }

      // Handle "not found" case (PGRST116 is PostgREST code for no rows)
      if (error.code === "PGRST116") {
        throw new Error(DeckErrorCodes.DECK_NOT_FOUND);
      }
      
      console.error("Database error in updateDeckName:", error);
      throw new Error(DeckErrorCodes.DATABASE_ERROR);
    }

    if (!data) {
      throw new Error(DeckErrorCodes.DECK_NOT_FOUND);
    }

    return {
      id: data.id,
      name: data.name,
    };
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(DeckErrorCodes).includes(error.message as any)) {
      throw error;
    }
    
    // Log and wrap unexpected errors
    console.error("Unexpected error in updateDeckName:", error);
    throw new Error(DeckErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Deletes a deck and all associated flashcards (via cascade)
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the deck
 * @param deckId - Deck ID to delete
 * @throws Error with DeckErrorCodes.DECK_NOT_FOUND if deck doesn't exist or doesn't belong to user
 * @throws Error with DeckErrorCodes.DATABASE_ERROR on database errors
 */
export async function deleteDeck(
  supabase: SupabaseClient,
  userId: string,
  deckId: number
): Promise<void> {
  try {
    const { error, count } = await supabase
      .from("decks")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("id", deckId);

    if (error) {
      console.error("Database error in deleteDeck:", error);
      throw new Error(DeckErrorCodes.DATABASE_ERROR);
    }

    // If count is 0, deck was not found or doesn't belong to user
    if (count === 0) {
      throw new Error(DeckErrorCodes.DECK_NOT_FOUND);
    }
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(DeckErrorCodes).includes(error.message as any)) {
      throw error;
    }
    
    // Log and wrap unexpected errors
    console.error("Unexpected error in deleteDeck:", error);
    throw new Error(DeckErrorCodes.DATABASE_ERROR);
  }
}

/**
 * Resets progress for all flashcards in a deck
 * Sets space_repetition to 'not_checked' and last_repetition to null
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID who owns the deck
 * @param deckId - Deck ID to reset progress for
 * @throws Error with DeckErrorCodes.DECK_NOT_FOUND if deck doesn't exist or doesn't belong to user
 * @throws Error with DeckErrorCodes.DATABASE_ERROR on database errors
 */
export async function resetDeckProgress(
  supabase: SupabaseClient,
  userId: string,
  deckId: number
): Promise<void> {
  try {
    // First, verify that the deck exists and belongs to the user
    const { data: deck, error: deckError } = await supabase
      .from("decks")
      .select("id")
      .eq("user_id", userId)
      .eq("id", deckId)
      .single();

    if (deckError) {
      // Handle "not found" case (PGRST116 is PostgREST code for no rows)
      if (deckError.code === "PGRST116") {
        throw new Error(DeckErrorCodes.DECK_NOT_FOUND);
      }

      console.error("Database error in resetDeckProgress (deck check):", deckError);
      throw new Error(DeckErrorCodes.DATABASE_ERROR);
    }

    if (!deck) {
      throw new Error(DeckErrorCodes.DECK_NOT_FOUND);
    }

    // Reset progress for all flashcards in the deck
    const { error: updateError } = await supabase
      .from("flashcards")
      .update({
        space_repetition: "not_checked",
        last_repetition: null,
      })
      .eq("user_id", userId)
      .eq("deck_id", deckId);

    if (updateError) {
      console.error("Database error in resetDeckProgress (update):", updateError);
      throw new Error(DeckErrorCodes.DATABASE_ERROR);
    }

    // Success - no return value needed
  } catch (error) {
    // Re-throw known domain errors
    if (error instanceof Error && Object.values(DeckErrorCodes).includes(error.message as any)) {
      throw error;
    }
    
    // Log and wrap unexpected errors
    console.error("Unexpected error in resetDeckProgress:", error);
    throw new Error(DeckErrorCodes.DATABASE_ERROR);
  }
}

