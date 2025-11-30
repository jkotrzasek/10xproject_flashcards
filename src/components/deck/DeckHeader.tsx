import { Button } from "../ui/button";
import type { DeckHeaderVM } from "../DeckDetailsPage";

// ============================================================================
// Types
// ============================================================================

interface DeckHeaderProps {
  deck: DeckHeaderVM;
  onResetProgress: () => void | Promise<void>;
  onStartLearn: () => void;
  onAddManual: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function DeckHeader({
  deck,
  onResetProgress,
  onStartLearn,
  onAddManual,
}: DeckHeaderProps) {
  return (
    <section className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      {/* Left side - Deck info */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-foreground mb-2">{deck.name}</h1>
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span>Liczba fiszek: {deck.flashcardCount}</span>
          <span>•</span>
          <span>Utworzono: {deck.createdAtLabel}</span>
          <span>•</span>
          <span>Aktualizowano: {deck.updatedAtLabel}</span>
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onStartLearn}
          disabled={deck.flashcardCount === 0 || deck.isResettingProgress}
          title={deck.flashcardCount === 0 ? "Brak fiszek do nauki" : "Rozpocznij naukę"}
        >
          Ucz się
        </Button>
        <Button
          variant="outline"
          onClick={onAddManual}
          disabled={deck.isResettingProgress}
        >
          Dodaj fiszkę
        </Button>
        <Button
          variant="destructive"
          onClick={onResetProgress}
          disabled={deck.isResettingProgress || deck.flashcardCount === 0}
          title={deck.flashcardCount === 0 ? "Brak fiszek do zresetowania" : "Zresetuj postęp nauki"}
        >
          {deck.isResettingProgress ? "Resetowanie..." : "Zresetuj postęp"}
        </Button>
      </div>
    </section>
  );
}

