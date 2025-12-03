import { useReducer, useEffect } from "react";
import { Toaster, toast } from "sonner";
import type { DeckDto } from "../types";
import { useDecksData } from "./dashboard/hooks/useDecksData";
import { useDeckMutations } from "./dashboard/hooks/useDeckMutations";
import { DeckListSection } from "./dashboard/DeckListSection";
import { VirtualDeckCard } from "./dashboard/VirtualDeckCard";
import { CreateDeckDialog } from "./dashboard/CreateDeckDialog";
import { UpdateDeckDialog } from "./dashboard/UpdateDeckDialog";
import { DeleteDeckConfirmDialog } from "./dashboard/DeleteDeckConfirmDialog";
import { Button } from "./ui/button";

// ============================================================================
// Types
// ============================================================================

type DeckSortOption = "name_asc" | "name_desc" | "created_asc" | "created_desc" | "updated_asc" | "updated_desc";

interface DeckCardViewModel extends DeckDto {
  updatedLabel: string;
  isMutating: boolean;
}

type DialogType = "create" | "update" | "delete" | null;

interface DialogState {
  type: DialogType;
  deck?: DeckCardViewModel;
}

interface DashboardState {
  decks: DeckCardViewModel[];
  isLoading: boolean;
  sort: DeckSortOption;
  unassignedCount: number;
  dialogState: DialogState;
}

type DashboardAction =
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_DECKS"; payload: DeckCardViewModel[] }
  | { type: "SET_UNASSIGNED_COUNT"; payload: number }
  | { type: "SET_SORT"; payload: DeckSortOption }
  | { type: "OPEN_DIALOG"; payload: DialogState }
  | { type: "CLOSE_DIALOG" }
  | { type: "SET_DECK_MUTATING"; payload: { id: number; isMutating: boolean } };

// ============================================================================
// Reducer
// ============================================================================

const initialState: DashboardState = {
  decks: [],
  isLoading: true,
  sort: "updated_desc",
  unassignedCount: 0,
  dialogState: { type: null },
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_DECKS":
      return { ...state, decks: action.payload, isLoading: false };
    case "SET_UNASSIGNED_COUNT":
      return { ...state, unassignedCount: action.payload };
    case "SET_SORT":
      return { ...state, sort: action.payload };
    case "OPEN_DIALOG":
      return { ...state, dialogState: action.payload };
    case "CLOSE_DIALOG":
      return { ...state, dialogState: { type: null } };
    case "SET_DECK_MUTATING":
      return {
        ...state,
        decks: state.decks.map((deck) =>
          deck.id === action.payload.id ? { ...deck, isMutating: action.payload.isMutating } : deck
        ),
      };
    default:
      return state;
  }
}

// ============================================================================
// Component
// ============================================================================

export default function DashboardPage() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const { decks, unassignedCount, isLoading, hasError, refetch } = useDecksData(state.sort);
  const { createDeck, updateDeck, deleteDeck } = useDeckMutations();

  // Synchronizacja danych z hooka do reducera
  useEffect(() => {
    dispatch({ type: "SET_DECKS", payload: decks });
  }, [decks]);

  useEffect(() => {
    dispatch({ type: "SET_UNASSIGNED_COUNT", payload: unassignedCount });
  }, [unassignedCount]);

  useEffect(() => {
    dispatch({ type: "SET_LOADING", payload: isLoading });
  }, [isLoading]);

  // Handlery dialogów
  const handleOpenCreateDialog = () => {
    dispatch({ type: "OPEN_DIALOG", payload: { type: "create" } });
  };

  const handleOpenUpdateDialog = (deck: DeckCardViewModel) => {
    dispatch({ type: "OPEN_DIALOG", payload: { type: "update", deck } });
  };

  const handleOpenDeleteDialog = (deck: DeckCardViewModel) => {
    dispatch({ type: "OPEN_DIALOG", payload: { type: "delete", deck } });
  };

  const handleCloseDialog = () => {
    dispatch({ type: "CLOSE_DIALOG" });
  };

  // Handlery mutacji
  const handleCreateDeck = async (values: { name: string }) => {
    try {
      await createDeck(values);
      handleCloseDialog();
      refetch();
      toast.success("Deck został utworzony");
    } catch (err) {
      // Błąd jest obsługiwany w dialugu i wyświetlany jako inline error
      throw err;
    }
  };

  const handleUpdateDeck = async (values: { name: string }) => {
    if (!state.dialogState.deck) return;
    try {
      await updateDeck(state.dialogState.deck.id, values);
      handleCloseDialog();
      refetch();
      toast.success("Deck został zaktualizowany");
    } catch (err) {
      // Błąd jest obsługiwany w dialugu i wyświetlany jako inline error
      throw err;
    }
  };

  const handleDeleteDeck = async () => {
    if (!state.dialogState.deck) return;
    try {
      await deleteDeck(state.dialogState.deck.id);
      handleCloseDialog();
      refetch();
      toast.success("Deck został usunięty");
    } catch (err) {
      // Błąd jest obsługiwany w dialugu i wyświetlany jako inline error
      throw err;
    }
  };

  // Handlery nawigacji
  const handleOpenDeck = (deckId: number) => {
    window.location.href = `/decks/${deckId}`;
  };

  const handleLearnDeck = (deckId: number) => {
    window.location.href = `/learn/${deckId}`;
  };

  const handleOpenUnassigned = () => {
    window.location.href = `/decks/unassigned`;
  };

  // Handlery sortowania
  const handleSortChange = (sort: DeckSortOption) => {
    dispatch({ type: "SET_SORT", payload: sort });
  };

  // Handlery generacji AI
  const handleGenerateFlashcards = () => {
    window.location.href = "/generator";
  };

  // Obliczanie czy są jakieś fiszki ogólnie
  const totalFlashcards = state.decks.reduce((sum, deck) => sum + deck.flashcard_count, 0) + state.unassignedCount;
  const hasDecksButNoFlashcards = state.decks.length > 0 && totalFlashcards === 0;

  return (
    <>
      <Toaster position="top-center" richColors />
      
      <div className="container mx-auto px-4 py-8">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Zarządzaj swoimi deckami i fiszkami</p>
          </div>
          {
            !hasError && (
              <Button onClick={handleOpenCreateDialog}>
                Stwórz nowy deck
              </Button>
            )
          }
        </div>

        {/* Error State - Błąd pobierania danych */}
        {hasError && (
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
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Nie udało się pobrać danych
              </h2>
              <p className="text-muted-foreground mb-6">
                Wystąpił problem z połączeniem. Sprawdź swoje połączenie z internetem i odśwież stronę.
              </p>
              <Button onClick={() => window.location.reload()}>
                Odśwież stronę
              </Button>
            </div>
          </div>
        )}

        {/* Virtual Deck Card - Nieprzypisane */}
        {!hasError && (
          <div className="mb-6 justify-center">
            <VirtualDeckCard count={state.unassignedCount} onOpen={handleOpenUnassigned} />
          </div>
        )}

        {/* Empty State - Brak fiszek ogólnie */}
        {!hasError && hasDecksButNoFlashcards && !state.isLoading && (
          <div className="mb-6">
            <div className="text-center py-8 border rounded-lg bg-primary/5 border-primary/20">
              <div className="max-w-md mx-auto">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nie masz jeszcze żadnych fiszek
                </h3>
                <p className="text-muted-foreground mb-4">
                  Wygeneruj fiszki używając AI lub dodaj je ręcznie
                </p>
                <Button onClick={handleGenerateFlashcards}>
                  Wygeneruj fiszki z AI
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Deck List Section */}
        {!hasError && (
          <DeckListSection
            decks={state.decks}
            isLoading={state.isLoading}
            sort={state.sort}
            onSortChange={handleSortChange}
            onOpenDeck={handleOpenDeck}
            onLearnDeck={handleLearnDeck}
            onEditDeck={handleOpenUpdateDialog}
            onDeleteDeck={handleOpenDeleteDialog}
            onCreateDeck={handleOpenCreateDialog}
          />
        )}
      </div>

      {/* CreateDeckDialog */}
      <CreateDeckDialog
        open={state.dialogState.type === "create"}
        onClose={handleCloseDialog}
        onSubmit={handleCreateDeck}
      />

      {/* UpdateDeckDialog */}
      <UpdateDeckDialog
        open={state.dialogState.type === "update"}
        deck={state.dialogState.deck}
        onClose={handleCloseDialog}
        onSubmit={handleUpdateDeck}
      />

      {/* DeleteDeckConfirmDialog */}
      <DeleteDeckConfirmDialog
        open={state.dialogState.type === "delete"}
        deck={state.dialogState.deck}
        onClose={handleCloseDialog}
        onConfirm={handleDeleteDeck}
      />
    </>
  );
}

