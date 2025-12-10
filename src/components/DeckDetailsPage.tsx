import { useReducer, useEffect, useState } from "react";
import { Toaster } from "./Toaster";
import { useDeckDetails } from "./deck/hooks/useDeckDetails";
import { useDeckFlashcards } from "./deck/hooks/useDeckFlashcards";
import { useDeckFlashcardMutations } from "./deck/hooks/useDeckFlashcardMutations";
import { useDeckMutations } from "./deck/hooks/useDeckMutations";
import { DeckHeader } from "./deck/DeckHeader";
import { DeckFlashcardList } from "./deck/DeckFlashcardList";
import { FlashcardEditDialog } from "./deck/FlashcardEditDialog";
import { ConfirmDialog } from "./deck/ConfirmDialog";
import { Button } from "./ui/button";
import { formatDate } from "../lib/format-date";

// ============================================================================
// Types
// ============================================================================

export interface DeckHeaderVM {
  id: number;
  name: string;
  flashcardCount: number;
  createdAtLabel: string;
  updatedAtLabel: string;
  isResettingProgress: boolean;
  error?: string;
}

export interface DeckFlashcardVM {
  id: number;
  front: string;
  back: string;
  source: string;
  spaceRepetition: string;
  lastRepetitionLabel: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  isDeleting: boolean;
  error?: string;
}

interface DeckDetailsState {
  deck: DeckHeaderVM | null;
  flashcards: DeckFlashcardVM[];
  visibleCount: number;

  isDeckLoading: boolean;
  isFlashcardsInitialLoading: boolean;
  isFlashcardsLoadingMore: boolean;

  loadDeckError?: string;
  loadFlashcardsError?: string;
  globalError?: string;
}

type DeckDetailsAction =
  | { type: "SET_DECK_LOADING"; payload: boolean }
  | { type: "SET_DECK_SUCCESS"; payload: DeckHeaderVM }
  | { type: "SET_DECK_ERROR"; payload?: string }
  | { type: "SET_FLASHCARDS_LOADING"; payload: boolean }
  | { type: "SET_FLASHCARDS_SUCCESS"; payload: DeckFlashcardVM[] }
  | { type: "SET_FLASHCARDS_ERROR"; payload?: string }
  | { type: "SET_VISIBLE_COUNT"; payload: number }
  | { type: "SET_LOADING_MORE"; payload: boolean }
  | { type: "SET_RESET_PROGRESS_LOADING"; payload: boolean }
  | { type: "SET_RESET_PROGRESS_ERROR"; payload?: string }
  | { type: "START_DELETE_FLASHCARD"; payload: { id: number } }
  | { type: "FINISH_DELETE_FLASHCARD"; payload: { id: number; error?: string } }
  | { type: "REMOVE_FLASHCARD"; payload: { id: number } }
  | { type: "UPDATE_FLASHCARD_CONTENT"; payload: { id: number; front: string; back: string; updatedAt: string } }
  | { type: "SET_GLOBAL_ERROR"; payload?: string };

// ============================================================================
// Reducer
// ============================================================================

const initialState: DeckDetailsState = {
  deck: null,
  flashcards: [],
  visibleCount: 20,
  isDeckLoading: true,
  isFlashcardsInitialLoading: true,
  isFlashcardsLoadingMore: false,
  loadDeckError: undefined,
  loadFlashcardsError: undefined,
  globalError: undefined,
};

function deckDetailsReducer(state: DeckDetailsState, action: DeckDetailsAction): DeckDetailsState {
  switch (action.type) {
    case "SET_DECK_LOADING":
      return { ...state, isDeckLoading: action.payload };
    case "SET_DECK_SUCCESS":
      return { ...state, deck: action.payload, isDeckLoading: false, loadDeckError: undefined };
    case "SET_DECK_ERROR":
      return { ...state, loadDeckError: action.payload, isDeckLoading: false };
    case "SET_FLASHCARDS_LOADING":
      return { ...state, isFlashcardsInitialLoading: action.payload };
    case "SET_FLASHCARDS_SUCCESS":
      return {
        ...state,
        flashcards: action.payload,
        isFlashcardsInitialLoading: false,
        loadFlashcardsError: undefined,
      };
    case "SET_FLASHCARDS_ERROR":
      return { ...state, loadFlashcardsError: action.payload, isFlashcardsInitialLoading: false };
    case "SET_VISIBLE_COUNT":
      return { ...state, visibleCount: action.payload, isFlashcardsLoadingMore: false };
    case "SET_LOADING_MORE":
      return { ...state, isFlashcardsLoadingMore: action.payload };
    case "SET_RESET_PROGRESS_LOADING":
      return {
        ...state,
        deck: state.deck ? { ...state.deck, isResettingProgress: action.payload } : null,
      };
    case "SET_RESET_PROGRESS_ERROR":
      return {
        ...state,
        deck: state.deck ? { ...state.deck, error: action.payload, isResettingProgress: false } : null,
      };
    case "START_DELETE_FLASHCARD":
      return {
        ...state,
        flashcards: state.flashcards.map((item) =>
          item.id === action.payload.id ? { ...item, isDeleting: true, error: undefined } : item
        ),
      };
    case "FINISH_DELETE_FLASHCARD":
      return {
        ...state,
        flashcards: state.flashcards.map((item) =>
          item.id === action.payload.id ? { ...item, isDeleting: false, error: action.payload.error } : item
        ),
      };
    case "REMOVE_FLASHCARD":
      return {
        ...state,
        flashcards: state.flashcards.filter((item) => item.id !== action.payload.id),
        deck: state.deck ? { ...state.deck, flashcardCount: state.deck.flashcardCount - 1 } : null,
      };
    case "UPDATE_FLASHCARD_CONTENT":
      return {
        ...state,
        flashcards: state.flashcards.map((item) =>
          item.id === action.payload.id
            ? {
                ...item,
                front: action.payload.front,
                back: action.payload.back,
                updatedAtLabel: action.payload.updatedAt,
                source: item.source === "AI" ? "AI (edytowana)" : item.source,
              }
            : item
        ),
      };
    case "SET_GLOBAL_ERROR":
      return { ...state, globalError: action.payload };
    default:
      return state;
  }
}

// ============================================================================
// Component
// ============================================================================

interface DeckDetailsPageProps {
  deckId: number;
}

export default function DeckDetailsPage({ deckId }: DeckDetailsPageProps) {
  const [state, dispatch] = useReducer(deckDetailsReducer, initialState);
  const [editingFlashcard, setEditingFlashcard] = useState<DeckFlashcardVM | null>(null);
  const [deletingFlashcardId, setDeletingFlashcardId] = useState<number | null>(null);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  // Walidacja deckId - jeśli jest NaN, nie próbuj ładować danych
  const isValidDeckId = !isNaN(deckId) && deckId > 0;

  const {
    deck: deckData,
    isLoading: isDeckLoading,
    error: deckError,
    refetch: refetchDeck,
  } = useDeckDetails(isValidDeckId ? deckId : 0);

  const {
    flashcards: flashcardsData,
    isLoading: isFlashcardsLoading,
    error: flashcardsError,
    refetch: refetchFlashcards,
  } = useDeckFlashcards(isValidDeckId ? deckId : 0);

  const { updateFlashcard, deleteFlashcard, isUpdating, isDeleting } = useDeckFlashcardMutations(deckId);

  const { resetProgress, isResettingProgress } = useDeckMutations(deckId, {
    onResetSuccess: () => {
      // Opcjonalnie odśwież fiszki aby zaktualizować statusy nauki
      refetchFlashcards();
    },
  });

  // Jeśli deckId jest nieprawidłowy, pokaż błąd
  if (!isValidDeckId) {
    return (
      <>
        <Toaster />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="mb-4 text-destructive">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Nieprawidłowy identyfikator decku</h2>
              <p className="text-muted-foreground mb-6">Podany identyfikator decku jest nieprawidłowy.</p>
              <Button onClick={() => (window.location.href = "/")}>Wróć do listy decków</Button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Synchronizacja danych decku z hooka do reducera
  useEffect(() => {
    if (deckError) {
      dispatch({ type: "SET_DECK_ERROR", payload: deckError.message });
    } else if (!isDeckLoading && deckData) {
      // Sync deck data with isResettingProgress from hook
      dispatch({
        type: "SET_DECK_SUCCESS",
        payload: { ...deckData, isResettingProgress },
      });
    }
  }, [deckData, isDeckLoading, deckError, isResettingProgress]);

  // Synchronizacja danych fiszek z hooka do reducera
  useEffect(() => {
    if (flashcardsError) {
      dispatch({ type: "SET_FLASHCARDS_ERROR", payload: flashcardsError.message });
    } else if (!isFlashcardsLoading) {
      dispatch({ type: "SET_FLASHCARDS_SUCCESS", payload: flashcardsData });
    }
  }, [flashcardsData, isFlashcardsLoading, flashcardsError]);

  useEffect(() => {
    dispatch({ type: "SET_DECK_LOADING", payload: isDeckLoading });
  }, [isDeckLoading]);

  useEffect(() => {
    dispatch({ type: "SET_FLASHCARDS_LOADING", payload: isFlashcardsLoading });
  }, [isFlashcardsLoading]);

  const visibleFlashcards = state.flashcards.slice(0, state.visibleCount);
  const hasMore = state.visibleCount < state.flashcards.length;

  const handleLoadMore = () => {
    if (!state.isFlashcardsLoadingMore && hasMore) {
      dispatch({ type: "SET_LOADING_MORE", payload: true });
      setTimeout(() => {
        dispatch({ type: "SET_VISIBLE_COUNT", payload: state.visibleCount + 20 });
      }, 100);
    }
  };

  const handleRetryDeck = () => {
    dispatch({ type: "SET_DECK_ERROR", payload: undefined });
    refetchDeck();
  };

  const handleRetryFlashcards = () => {
    dispatch({ type: "SET_FLASHCARDS_ERROR", payload: undefined });
    refetchFlashcards();
  };

  const handleResetProgress = () => {
    setIsResetDialogOpen(true);
  };

  const handleResetConfirm = async () => {
    const result = await resetProgress();

    if (result.success) {
      // Success handled by toast in hook
      setIsResetDialogOpen(false);
    } else if (result.error === "DECK_NOT_FOUND") {
      // Deck doesn't exist, redirect to dashboard
      setIsResetDialogOpen(false);
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
    }
    // For other errors, keep dialog open (toast already shown)
  };

  const handleStartLearn = () => {
    window.location.href = `/learn/${deckId}`;
  };

  const handleAddManual = () => {
    window.location.href = `/manual?deckId=${deckId}`;
  };

  const handleEdit = (flashcardId: number) => {
    const flashcard = state.flashcards.find((f) => f.id === flashcardId);
    if (flashcard) {
      setEditingFlashcard(flashcard);
    }
  };

  const handleEditSubmit = async (values: { front: string; back: string }) => {
    if (!editingFlashcard) return;

    const result = await updateFlashcard({
      flashcardId: editingFlashcard.id,
      front: values.front,
      back: values.back,
    });

    if (result.success) {
      // Update local state with formatted date
      const updatedAtLabel = result.updatedAt ? formatDate(result.updatedAt) : "Przed chwilą";
      dispatch({
        type: "UPDATE_FLASHCARD_CONTENT",
        payload: {
          id: editingFlashcard.id,
          front: values.front,
          back: values.back,
          updatedAt: updatedAtLabel,
        },
      });
      // Close dialog
      setEditingFlashcard(null);
    } else if (result.error === "FLASHCARD_NOT_FOUND") {
      // Remove flashcard from list
      dispatch({ type: "REMOVE_FLASHCARD", payload: { id: editingFlashcard.id } });
      setEditingFlashcard(null);
    }
    // For validation errors, keep dialog open to show error
  };

  const handleDelete = (flashcardId: number) => {
    setDeletingFlashcardId(flashcardId);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingFlashcardId) return;

    dispatch({ type: "START_DELETE_FLASHCARD", payload: { id: deletingFlashcardId } });

    const result = await deleteFlashcard(deletingFlashcardId);

    if (result.success) {
      // Remove from list
      dispatch({ type: "REMOVE_FLASHCARD", payload: { id: deletingFlashcardId } });
    } else {
      // Show error
      dispatch({
        type: "FINISH_DELETE_FLASHCARD",
        payload: { id: deletingFlashcardId, error: result.error },
      });
    }

    setDeletingFlashcardId(null);
  };

  // Jeśli wystąpił błąd przy ładowaniu decku (szczególnie 404)
  if (state.loadDeckError) {
    return (
      <>
        <Toaster />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="mb-4 text-destructive">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Nie udało się pobrać decku</h2>
              <p className="text-muted-foreground mb-6">{state.loadDeckError}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={handleRetryDeck}>Spróbuj ponownie</Button>
                <Button variant="outline" onClick={() => (window.location.href = "/")}>
                  Wróć do listy decków
                </Button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Toaster />

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        {state.isDeckLoading ? (
          <div className="mb-8 animate-pulse">
            <div className="h-8 w-1/3 bg-muted rounded mb-2"></div>
            <div className="h-4 w-1/4 bg-muted rounded"></div>
          </div>
        ) : state.deck ? (
          <DeckHeader
            deck={state.deck}
            onResetProgress={handleResetProgress}
            onStartLearn={handleStartLearn}
            onAddManual={handleAddManual}
          />
        ) : null}

        {/* Error State - Failed to load flashcards */}
        {state.loadFlashcardsError && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="mb-4 text-destructive">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Nie udało się pobrać fiszek</h2>
              <p className="text-muted-foreground mb-6">{state.loadFlashcardsError}</p>
              <Button onClick={handleRetryFlashcards}>Spróbuj ponownie</Button>
            </div>
          </div>
        )}

        {/* Empty State - No flashcards in deck */}
        {!state.isFlashcardsInitialLoading && !state.loadFlashcardsError && state.flashcards.length === 0 && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center max-w-md">
              <div className="mb-4 text-muted-foreground">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Ten deck nie zawiera jeszcze żadnych fiszek
              </h2>
              <p className="text-muted-foreground mb-6">Dodaj fiszki używając generatora AI lub dodaj je ręcznie.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => (window.location.href = "/generator")}>Generator AI</Button>
                <Button variant="outline" onClick={handleAddManual}>
                  Dodaj ręcznie
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Flashcard List */}
        {!state.loadFlashcardsError && (
          <DeckFlashcardList
            items={visibleFlashcards}
            isInitialLoading={state.isFlashcardsInitialLoading}
            isLoadingMore={state.isFlashcardsLoadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onEdit={handleEdit}
            onDelete={handleDelete}
            startIndex={0}
          />
        )}
      </main>

      {/* Edit Dialog */}
      <FlashcardEditDialog
        open={editingFlashcard !== null}
        flashcard={editingFlashcard || undefined}
        isSaving={isUpdating}
        onOpenChange={(open) => {
          if (!open) setEditingFlashcard(null);
        }}
        onSubmit={handleEditSubmit}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deletingFlashcardId !== null}
        title="Usuń fiszkę"
        description="Czy na pewno chcesz usunąć tę fiszkę? Tej operacji nie można cofnąć."
        confirmText="Usuń"
        variant="destructive"
        isLoading={isDeleting}
        onOpenChange={(open) => {
          if (!open) setDeletingFlashcardId(null);
        }}
        onConfirm={handleDeleteConfirm}
      />

      {/* Reset Progress Confirmation Dialog */}
      <ConfirmDialog
        open={isResetDialogOpen}
        title="Zresetuj postęp nauki"
        description="Ta operacja usunie historię wszystkich powtórek w tym decku. Wszystkie fiszki powrócą do stanu początkowego. Tej operacji nie można cofnąć."
        confirmText="Zresetuj postęp"
        variant="destructive"
        isLoading={isResettingProgress}
        requireConfirmation={{
          text: "reset",
          label: 'Wpisz "reset" aby potwierdzić',
          placeholder: "reset",
        }}
        onOpenChange={(open) => {
          if (!open) setIsResetDialogOpen(false);
        }}
        onConfirm={handleResetConfirm}
      />
    </>
  );
}
