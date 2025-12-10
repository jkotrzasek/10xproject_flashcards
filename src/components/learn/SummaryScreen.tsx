import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import type { LearnSessionMetaViewModel, LearnSessionStats } from "./typesLearn";

// ============================================================================
// Types
// ============================================================================

interface SummaryScreenProps {
  deckId: number;
  stats: LearnSessionStats;
  meta: LearnSessionMetaViewModel | null;
  onContinue: () => void;
  onGoToDeck: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Summary screen component
 * Displays session statistics and options to continue or return to deck
 */
export function SummaryScreen({ deckId, stats, meta, onContinue, onGoToDeck }: SummaryScreenProps) {
  const totalReviewed = stats.reviewedCount;
  const okCount = stats.okCount;
  const nokCount = stats.nokCount;
  const totalDue = meta?.totalDue || 0;
  const deckTotal = meta?.deckTotal || 0;

  // Calculate percentage if applicable
  const okPercentage = totalReviewed > 0 ? Math.round((okCount / totalReviewed) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-2xl">🎉 Sesja zakończona!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main stats */}
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-foreground">{totalReviewed}</div>
            <div className="text-muted-foreground">
              {totalReviewed === 1 ? "fiszka powtórzona" : "fiszek powtórzonych"}
            </div>
          </div>

          {/* Detailed stats */}
          <div className="grid grid-cols-2 gap-4 text-center py-4 border-t border-b">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600 dark:text-green-500">{okCount}</div>
              <div className="text-sm text-muted-foreground">Wiedziałem</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-destructive">{nokCount}</div>
              <div className="text-sm text-muted-foreground">Nie wiedziałem</div>
            </div>
          </div>

          {/* Percentage */}
          {totalReviewed > 0 && (
            <div className="text-center space-y-2">
              <div className="text-xl font-semibold text-foreground">{okPercentage}% poprawnych odpowiedzi</div>
            </div>
          )}

          {/* Additional info */}
          <div className="text-center text-sm text-muted-foreground space-y-1">
            {totalDue > totalReviewed && (
              <p>
                Pozostało jeszcze {totalDue - totalReviewed} {totalDue - totalReviewed === 1 ? "fiszka" : "fiszek"} do
                powtórki.
              </p>
            )}
            {deckTotal > 0 && (
              <p>
                W całym decku jest {deckTotal} {deckTotal === 1 ? "fiszka" : "fiszek"}.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Button size="lg" className="flex-1" onClick={onContinue}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Kontynuuj naukę
        </Button>
        <Button variant="outline" size="lg" className="flex-1" onClick={onGoToDeck}>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Wróć do decku
        </Button>
      </div>
    </div>
  );
}
