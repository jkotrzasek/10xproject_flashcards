import { useState } from "react";
import type { CreateDeckCommand, UpdateDeckCommand, ApiResponse, DeckCreatedDto } from "../../../types";

// ============================================================================
// Types
// ============================================================================

interface DeckMutationError extends Error {
  code?: string;
}

interface UseDeckMutationsResult {
  createDeck: (command: CreateDeckCommand) => Promise<void>;
  updateDeck: (id: number, command: UpdateDeckCommand) => Promise<void>;
  deleteDeck: (id: number) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

function createMutationError(message: string, code?: string): DeckMutationError {
  const error = new Error(message) as DeckMutationError;
  error.code = code;
  return error;
}

async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);

    if (response.status === 401) {
      // Przekieruj do strony logowania
      window.location.href = "/login";
      throw createMutationError("Sesja wygasła. Zaloguj się ponownie.", "UNAUTHORIZED");
    }

    if (response.status === 409) {
      throw createMutationError("Deck o tej nazwie już istnieje", "DUPLICATE_NAME");
    }

    if (response.status === 404) {
      throw createMutationError("Deck nie został znaleziony", "NOT_FOUND");
    }

    if (response.status === 400) {
      const message = errorData?.error?.message || "Nieprawidłowe dane";
      throw createMutationError(message, "VALIDATION_ERROR");
    }

    throw createMutationError("Wystąpił błąd. Spróbuj ponownie", "UNKNOWN");
  }

  // Obsługa 204 No Content (np. DELETE)
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// ============================================================================
// Hook
// ============================================================================

export function useDeckMutations(): UseDeckMutationsResult {
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const createDeck = async (command: CreateDeckCommand): Promise<void> => {
    setIsCreating(true);
    try {
      await handleApiResponse<ApiResponse<DeckCreatedDto>>(
        await fetch("/api/decks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        })
      );
    } finally {
      setIsCreating(false);
    }
  };

  const updateDeck = async (id: number, command: UpdateDeckCommand): Promise<void> => {
    setIsUpdating(true);
    try {
      await handleApiResponse(
        await fetch(`/api/decks/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(command),
        })
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteDeck = async (id: number): Promise<void> => {
    setIsDeleting(true);
    try {
      await handleApiResponse(
        await fetch(`/api/decks/${id}`, {
          method: "DELETE",
        })
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    createDeck,
    updateDeck,
    deleteDeck,
    isCreating,
    isUpdating,
    isDeleting,
  };
}
