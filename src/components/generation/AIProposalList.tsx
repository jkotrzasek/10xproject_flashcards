import { AIProposal } from "./AIProposal";
import { DeckSelect } from "./DeckSelect";
import { Button } from "../ui/button";
import type { FlashcardProposalVM } from "./generationTypes";
import type { DeckDto } from "../../types";

// ============================================================================
// Types
// ============================================================================

interface AIProposalListProps {
  items: FlashcardProposalVM[];
  onChange: (itemId: number, changes: Partial<FlashcardProposalVM>) => void;
  decks: DeckDto[];
  selectedDeckId: number | null | undefined;
  onDeckChange: (value: number | null) => void;
  isLoadingDecks: boolean;
  onSaveAccepted?: () => void;
  onSaveAll?: () => void;
  onCancel?: () => void;
  isSaving?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function AIProposalList({
  items,
  onChange,
  decks,
  selectedDeckId,
  onDeckChange,
  isLoadingDecks,
  onSaveAccepted,
  onSaveAll,
  onCancel,
  isSaving = false,
}: AIProposalListProps) {
  if (items.length === 0) {
    return null;
  }

  const acceptedCount = items.filter((item) => item.accepted).length;
  const editedCount = items.filter((item) => item.isEdited).length;
  const canSaveAccepted = acceptedCount > 0 && !isSaving;
  const canSaveAll = items.length > 0 && !isSaving;

  return (
    <div className="space-y-4">
      {/* Sticky header with actions */}
      <div className="sticky top-0 z-10 rounded-lg border border-border bg-card/95 p-4 shadow-md backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left: Title and stats */}
          <div>
            <h2 className="text-lg font-semibold">Propozycje fiszek</h2>
            <p className="text-sm text-muted-foreground">
              {acceptedCount} z {items.length} zaakceptowanych
              {editedCount > 0 && ` • ${editedCount} edytowanych`}
            </p>
          </div>

          {/* Right: Deck select + Save buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Deck Select - compact */}
            <div className="min-w-[180px]">
              {isLoadingDecks ? (
                <div className="h-9 w-[180px] animate-pulse rounded bg-muted"></div>
              ) : (
                <DeckSelect
                  decks={decks}
                  value={selectedDeckId}
                  onChange={onDeckChange}
                  disabled={isSaving}
                  compact
                />
              )}
            </div>

            {/* Action buttons */}
            <Button
              onClick={onSaveAccepted}
              disabled={!canSaveAccepted}
              variant="default"
              size="default"
            >
              {isSaving ? "Zapisywanie..." : `Zapisz zaakceptowane (${acceptedCount})`}
            </Button>
            <Button
              onClick={onSaveAll}
              disabled={!canSaveAll}
              variant="secondary"
              size="default"
            >
              Zapisz wszystkie ({items.length})
            </Button>
            <Button
              onClick={onCancel}
              disabled={isSaving}
              variant="outline"
              size="default"
            >
              Anuluj
            </Button>
          </div>
        </div>
      </div>

      {/* Proposals grid - 3 columns */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <AIProposal
            key={item.id}
            item={item}
            onChange={(changes) => onChange(item.id, changes)}
          />
        ))}
      </div>
    </div>
  );
}

