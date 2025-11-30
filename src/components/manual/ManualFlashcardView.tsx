import { useEffect } from "react";
import { toast } from "sonner";
import { useDecks } from "./hooks/useDecks";
import { ManualFlashcardForm } from "./ManualFlashcardForm";
import { Toaster } from "../Toaster";
import { Button } from "../ui/button";

// ============================================================================
// Types
// ============================================================================

interface ManualFlashcardViewProps {
  initialDeckId?: number | null;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Container component for manual flashcard creation view
 * Handles fetching decks and displaying the form with appropriate states
 */
export function ManualFlashcardView({ initialDeckId }: ManualFlashcardViewProps) {
  const { deckOptions, isLoading, error, refetch } = useDecks();

  // Validate initialDeckId exists in deck options
  useEffect(() => {
    if (!isLoading && initialDeckId && deckOptions.length > 0) {
      const deckExists = deckOptions.some((option) => option.id === initialDeckId);
      if (!deckExists) {
        toast.warning("Wybrany deck nie został znaleziony");
      }
    }
  }, [initialDeckId, deckOptions, isLoading]);

  // Handler for returning to deck
  const handleReturnToDeck = () => {
    if (initialDeckId) {
      window.location.href = `/decks/${initialDeckId}`;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <>
        <Toaster />
        <div className="flex flex-col" style={{ height: "calc(100vh - 73px)" }}>
          <div className="shrink-0 border-b border-border bg-background">
            <div className="container mx-auto max-w-7xl px-4 py-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="h-8 w-64 animate-pulse rounded bg-muted"></div>
                  <div className="h-4 w-96 animate-pulse rounded bg-muted"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error) {
    return (
      <>
        <Toaster />
        <div className="flex flex-col" style={{ height: "calc(100vh - 73px)" }}>
          <div className="shrink-0 border-b border-border bg-background">
            <div className="container mx-auto max-w-7xl px-4 py-6">
              <div className="space-y-6">
                <header className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold">Dodaj fiszki manualnie</h1>
                      <p className="text-sm text-muted-foreground">
                        Ręcznie twórz fiszki i przypisuj je do swoich decków.
                      </p>
                    </div>
                    {initialDeckId && (
                      <Button
                        variant="outline"
                        onClick={handleReturnToDeck}
                        className="shrink-0"
                      >
                        ← Powrót do decku
                      </Button>
                    )}
                  </div>
                </header>

                <div className="rounded-lg bg-destructive/10 p-4 text-destructive" role="alert">
                  <h2 className="mb-2 font-semibold">Błąd ładowania decków</h2>
                  <p className="mb-3">{error.message}</p>
                  <button
                    onClick={refetch}
                    className="rounded bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                  >
                    Spróbuj ponownie
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Success state - render form
  return (
    <>
      <Toaster />
      <div className="flex flex-col" style={{ height: "calc(100vh - 73px)" }}>
        <div className="shrink-0 border-b border-border bg-background">
          <div className="container mx-auto max-w-7xl px-4 py-6">
            <div className="space-y-6">
              <header className="space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-bold">Dodaj fiszki manualnie</h1>
                    <p className="text-sm text-muted-foreground">
                      Ręcznie twórz fiszki i przypisuj je do swoich decków.
                    </p>
                  </div>
                  {initialDeckId && (
                    <Button
                      variant="outline"
                      onClick={handleReturnToDeck}
                      className="shrink-0"
                    >
                      ← Powrót do decku
                    </Button>
                  )}
                </div>
              </header>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-7xl px-4 py-6">
            <ManualFlashcardForm 
              deckOptions={deckOptions} 
              initialDeckId={initialDeckId}
              onSuccess={refetch}
            />
          </div>
        </div>
      </div>
    </>
  );
}

