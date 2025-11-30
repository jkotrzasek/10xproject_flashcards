import type { LearnSessionMetaViewModel, LearnSessionStats } from "./typesLearn";

// ============================================================================
// Types
// ============================================================================

interface SessionCounterProps {
  currentNumber: number;
  totalInSession: number;
  meta: LearnSessionMetaViewModel | null;
  stats: LearnSessionStats;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Session counter component
 * Displays current card number, session info, and review statistics
 */
export function SessionCounter({ 
  currentNumber, 
  totalInSession, 
  meta, 
  stats 
}: SessionCounterProps) {
  // Clamp values to minimum 0
  const safeCurrentNumber = Math.max(0, currentNumber);
  const safeTotalInSession = Math.max(0, totalInSession);
  const safeTotalDue = Math.max(0, meta?.totalDue || 0);
  const safeDeckTotal = Math.max(0, meta?.deckTotal || 0);
  const safeOkCount = Math.max(0, stats.okCount);
  const safeNokCount = Math.max(0, stats.nokCount);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
      {/* Current card */}
      <div className="space-y-1">
        <div className="text-2xl font-bold text-foreground">
          {safeCurrentNumber}/{safeTotalInSession}
        </div>
        <div className="text-xs text-muted-foreground">
          Karta w sesji
        </div>
      </div>

      {/* Total due */}
      <div className="space-y-1">
        <div className="text-2xl font-bold text-foreground">
          {safeTotalDue}
        </div>
        <div className="text-xs text-muted-foreground">
          Do powtórki
        </div>
      </div>

      {/* Deck total */}
      <div className="space-y-1">
        <div className="text-2xl font-bold text-foreground">
          {safeDeckTotal}
        </div>
        <div className="text-xs text-muted-foreground">
          W decku
        </div>
      </div>

      {/* Review stats */}
      <div className="space-y-1">
        <div className="text-2xl font-bold text-foreground">
          <span className="text-green-600 dark:text-green-500">{safeOkCount}</span>
          {" / "}
          <span className="text-destructive">{safeNokCount}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          OK / NOK
        </div>
      </div>
    </div>
  );
}

