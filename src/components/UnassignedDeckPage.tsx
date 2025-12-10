import { useReducer, useEffect } from "react";
import { Toaster } from "./Toaster";
import { useDeckOptions } from "./unassigned/hooks/useDeckOptions";
import { useUnassignedFlashcards } from "./unassigned/hooks/useUnassignedFlashcards";
import { useAssignFlashcardToDeck } from "./unassigned/hooks/useAssignFlashcardToDeck";
import { useDeleteFlashcard } from "./unassigned/hooks/useDeleteFlashcard";
import { UnassignedFlashcardList } from "./unassigned/UnassignedFlashcardList";
import { Button } from "./ui/button";

// ============================================================================
// Types
// ============================================================================

export interface DeckOptionVM {
  id: number;
  name: string;
}

export interface UnassignedFlashcardVM {
  id: number;
  front: string;
  back: string;
  source: string;
  spaceRepetition: string;
  lastRepetitionLabel: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  isAssigning: boolean;
  assignError?: string;
}

interface UnassignedDeckState {
  items: UnassignedFlashcardVM[];
  visibleCount: number;
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  loadError?: string;
  assignGlobalError?: string;
}

type UnassignedDeckAction =
  | { type: "SET_INITIAL_LOADING"; payload: boolean }
  | { type: "SET_ITEMS"; payload: UnassignedFlashcardVM[] }
  | { type: "SET_VISIBLE_COUNT"; payload: number }
  | { type: "SET_LOADING_MORE"; payload: boolean }
  | { type: "SET_LOAD_ERROR"; payload?: string }
  | { type: "START_ASSIGN"; payload: { id: number } }
  | { type: "FINISH_ASSIGN"; payload: { id: number; error?: string } }
  | { type: "START_DELETE"; payload: { id: number } }
  | { type: "FINISH_DELETE"; payload: { id: number; error?: string } }
  | { type: "REMOVE_ITEM"; payload: { id: number } }
  | { type: "SET_GLOBAL_ASSIGN_ERROR"; payload?: string };

// ============================================================================
// Reducer
// ============================================================================

const initialState: UnassignedDeckState = {
  items: [],
  visibleCount: 20,
  isInitialLoading: true,
  isLoadingMore: false,
  loadError: undefined,
  assignGlobalError: undefined,
};

function unassignedDeckReducer(state: UnassignedDeckState, action: UnassignedDeckAction): UnassignedDeckState {
  switch (action.type) {
    case "SET_INITIAL_LOADING":
      return { ...state, isInitialLoading: action.payload };
    case "SET_ITEMS":
      return { ...state, items: action.payload, isInitialLoading: false };
    case "SET_VISIBLE_COUNT":
      return { ...state, visibleCount: action.payload, isLoadingMore: false };
    case "SET_LOADING_MORE":
      return { ...state, isLoadingMore: action.payload };
    case "SET_LOAD_ERROR":
      return { ...state, loadError: action.payload, isInitialLoading: false };
    case "START_ASSIGN":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, isAssigning: true, assignError: undefined } : item
        ),
      };
    case "FINISH_ASSIGN":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, isAssigning: false, assignError: action.payload.error } : item
        ),
      };
    case "START_DELETE":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, isAssigning: true, assignError: undefined } : item
        ),
      };
    case "FINISH_DELETE":
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === action.payload.id ? { ...item, isAssigning: false, assignError: action.payload.error } : item
        ),
      };
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload.id),
      };
    case "SET_GLOBAL_ASSIGN_ERROR":
      return { ...state, assignGlobalError: action.payload };
    default:
      return state;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function UnassignedDeckPage() {
  const [state, dispatch] = useReducer(unassignedDeckReducer, initialState);
  const {
    options: deckOptions,
    isLoading: isLoadingDecks,
    error: deckOptionsError,
    refetch: refetchDecks,
  } = useDeckOptions();
  const {
    items: flashcards,
    isLoading: isLoadingFlashcards,
    error: flashcardsError,
    refetch: refetchFlashcards,
  } = useUnassignedFlashcards();
  const { assign } = useAssignFlashcardToDeck();
  const { deleteFlashcard } = useDeleteFlashcard();

  // Synchronizacja danych z hooka do reducera
  useEffect(() => {
    if (flashcardsError) {
      dispatch({ type: "SET_LOAD_ERROR", payload: flashcardsError.message });
    } else if (!isLoadingFlashcards) {
      dispatch({ type: "SET_ITEMS", payload: flashcards });
    }
  }, [flashcards, isLoadingFlashcards, flashcardsError]);

  useEffect(() => {
    dispatch({ type: "SET_INITIAL_LOADING", payload: isLoadingFlashcards });
  }, [isLoadingFlashcards]);

  const hasDecks = deckOptions.length > 0;
  const visibleItems = state.items.slice(0, state.visibleCount);
  const hasMore = state.visibleCount < state.items.length;

  const handleLoadMore = () => {
    if (!state.isLoadingMore && hasMore) {
      dispatch({ type: "SET_LOADING_MORE", payload: true });
      // Zwiększ widoczną liczbę o 20
      setTimeout(() => {
        dispatch({ type: "SET_VISIBLE_COUNT", payload: state.visibleCount + 20 });
      }, 100);
    }
  };

  const handleRetry = () => {
    dispatch({ type: "SET_LOAD_ERROR", payload: undefined });
    refetchFlashcards();
  };

  const handleAssign = async (flashcardId: number, deckId: number) => {
    // Start assigning - set loading state
    dispatch({ type: "START_ASSIGN", payload: { id: flashcardId } });

    // Call API
    const result = await assign({ flashcardId, deckId });

    if (result.success) {
      // Remove item from list on success
      dispatch({ type: "REMOVE_ITEM", payload: { id: flashcardId } });
    } else {
      // Set error on failure
      dispatch({
        type: "FINISH_ASSIGN",
        payload: { id: flashcardId, error: result.error },
      });
    }
  };

  const handleDelete = async (flashcardId: number) => {
    // Start deleting - set loading state (reusing isAssigning flag)
    dispatch({ type: "START_DELETE", payload: { id: flashcardId } });

    // Call API
    const result = await deleteFlashcard(flashcardId);

    if (result.success) {
      // Remove item from list on success
      dispatch({ type: "REMOVE_ITEM", payload: { id: flashcardId } });
    } else {
      // Set error on failure
      dispatch({
        type: "FINISH_DELETE",
        payload: { id: flashcardId, error: result.error },
      });
    }
  };

  return (
    <>
      <Toaster />

      <main className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Nieprzypisane fiszki</h1>
          <p className="text-muted-foreground">
            {state.isInitialLoading ? "Ładowanie..." : `Liczba nieprzypisanych fiszek: ${state.items.length}`}
          </p>
        </div>

        {/* Global Deck Options Error */}
        {deckOptionsError && (
          <div className="mb-6 rounded-lg bg-destructive/10 p-4 text-destructive border border-destructive/20">
            <h2 className="mb-2 font-semibold">Nie udało się załadować listy decków</h2>
            <p className="mb-4">{deckOptionsError.message}</p>
            <Button variant="outline" onClick={() => refetchDecks()}>
              Spróbuj ponownie
            </Button>
          </div>
        )}

        {/* No Decks Info */}
        {!isLoadingDecks && !deckOptionsError && !hasDecks && (
          <div className="mb-6 rounded-lg border border-border bg-card p-6 text-center">
            <h3 className="text-lg font-semibold text-foreground mb-2">Nie masz jeszcze żadnych decków</h3>
            <p className="text-muted-foreground">Utwórz deck w Dashboardzie, aby przypisać fiszki.</p>
          </div>
        )}

        {/* Error State - Failed to load flashcards */}
        {state.loadError && (
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
              <p className="text-muted-foreground mb-6">{state.loadError}</p>
              <Button onClick={handleRetry}>Spróbuj ponownie</Button>
            </div>
          </div>
        )}

        {/* Empty State - No unassigned flashcards */}
        {!state.isInitialLoading && !state.loadError && state.items.length === 0 && (
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
              <h2 className="text-xl font-semibold text-foreground mb-2">Nie masz żadnych nieprzypisanych fiszek</h2>
              <p className="text-muted-foreground">Wszystkie Twoje fiszki są przypisane do decków.</p>
            </div>
          </div>
        )}

        {/* Loading State - Initial loading */}
        {state.isInitialLoading && (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="border rounded-lg p-4 bg-card animate-pulse">
                <div className="h-4 w-3/4 bg-muted rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        )}

        {/* Flashcard List */}
        {!state.loadError && (
          <UnassignedFlashcardList
            items={visibleItems}
            isInitialLoading={state.isInitialLoading}
            isLoadingMore={state.isLoadingMore}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onAssign={handleAssign}
            onDelete={handleDelete}
            deckOptions={deckOptions}
            hasDecks={hasDecks}
          />
        )}
      </main>
    </>
  );
}
