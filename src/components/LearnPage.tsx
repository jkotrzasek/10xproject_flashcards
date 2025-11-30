import { Toaster } from "./Toaster";
import { Button } from "./ui/button";
import { useLearnSession } from "./learn/hooks/useLearnSession";
import { StudyCard } from "./learn/StudyCard";
import { ReviewControls } from "./learn/ReviewControls";
import { ProgressBar } from "./learn/ProgressBar";
import { SessionCounter } from "./learn/SessionCounter";
import { SummaryScreen } from "./learn/SummaryScreen";

// ============================================================================
// Types
// ============================================================================

interface LearnPageProps {
  deckId: number;
}

// ============================================================================
// Component
// ============================================================================

export default function LearnPage({ deckId }: LearnPageProps) {
  // Validate deckId
  const isValidDeckId = !isNaN(deckId) && deckId > 0;

  const {
    phase,
    currentCard,
    currentIndex,
    isBackVisible,
    isTransitioning,
    meta,
    stats,
    isFlushing,
    errorMessage,
    revealAnswer,
    answerCurrent,
    continueSession,
    goToDeck,
    retryLoad,
  } = useLearnSession(isValidDeckId ? deckId : 0);

  // Invalid deckId
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
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Nieprawidłowy identyfikator decku
              </h2>
              <p className="text-muted-foreground mb-6">
                Podany identyfikator decku jest nieprawidłowy.
              </p>
              <Button onClick={() => window.location.href = "/"}>
                Wróć do listy decków
              </Button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Error state
  if (phase === 'error') {
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
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Nie udało się załadować fiszek
              </h2>
              <p className="text-muted-foreground mb-6">
                {errorMessage || "Wystąpił błąd podczas ładowania fiszek."}
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={retryLoad}>Spróbuj ponownie</Button>
                <Button variant="outline" onClick={goToDeck}>
                  Wróć do decku
                </Button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Loading state
  if (phase === 'loading') {
    return (
      <>
        <Toaster />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-4 w-1/3 bg-muted rounded"></div>
              <div className="h-2 w-full bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded-xl"></div>
              <div className="flex gap-4">
                <div className="h-10 flex-1 bg-muted rounded"></div>
                <div className="h-10 flex-1 bg-muted rounded"></div>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Empty state
  if (phase === 'empty') {
    return (
      <>
        <Toaster />
        <main className="container mx-auto px-4 py-8">
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
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Świetna robota!
              </h2>
              <p className="text-muted-foreground mb-6">
                Nie ma więcej fiszek do nauki w tym decku.
              </p>
              {meta && meta.deckTotal > 0 && (
                <p className="text-sm text-muted-foreground mb-6">
                  W decku jest {meta.deckTotal} {meta.deckTotal === 1 ? 'fiszka' : 'fiszek'}, 
                  ale wszystkie są już powtórzone.
                </p>
              )}
              <Button onClick={goToDeck}>
                Wróć do decku
              </Button>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Summary state
  if (phase === 'summary') {
    return (
      <>
        <Toaster />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <SummaryScreen
              deckId={deckId}
              stats={stats}
              meta={meta}
              onContinue={continueSession}
              onGoToDeck={goToDeck}
            />
          </div>
        </main>
      </>
    );
  }

  // Learning state
  const totalInSession = meta?.returned || 0;

  return (
    <>
      <Toaster />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Progress and Stats */}
          <div className="space-y-4">
            <SessionCounter
              currentNumber={currentIndex + 1}
              totalInSession={totalInSession}
              meta={meta}
              stats={stats}
            />
            <ProgressBar
              current={stats.reviewedCount}
              total={totalInSession}
            />
          </div>

          {/* Study Card */}
          <StudyCard
            card={currentCard}
            isBackVisible={isBackVisible}
            isTransitioning={isTransitioning}
            onReveal={revealAnswer}
          />

          {/* Review Controls */}
          <ReviewControls
            disabled={!isBackVisible || isFlushing}
            isBackVisible={isBackVisible}
            onAnswer={answerCurrent}
          />

          {/* Error message (if any during review submission) */}
          {errorMessage && (
            <div className="text-center text-sm text-destructive">
              {errorMessage}
            </div>
          )}
        </div>
      </main>
    </>
  );
}

