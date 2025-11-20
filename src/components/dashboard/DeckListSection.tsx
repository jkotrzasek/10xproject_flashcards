import { DeckCard } from "./DeckCard";
import { SkeletonList } from "../SkeletonList";
import { CTAEmptyState } from "../CTAEmptyState";
import type { DeckDto } from "../../types";

// ============================================================================
// Types
// ============================================================================

type DeckSortOption = "name_asc" | "name_desc" | "created_asc" | "created_desc" | "updated_asc" | "updated_desc";

interface DeckCardViewModel extends DeckDto {
  updatedLabel: string;
  isMutating: boolean;
}

interface DeckListSectionProps {
  decks: DeckCardViewModel[];
  isLoading: boolean;
  sort: DeckSortOption;
  onSortChange: (sort: DeckSortOption) => void;
  onOpenDeck: (deckId: number) => void;
  onLearnDeck: (deckId: number) => void;
  onEditDeck: (deck: DeckCardViewModel) => void;
  onDeleteDeck: (deck: DeckCardViewModel) => void;
  onCreateDeck: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function DeckListSection({
  decks,
  isLoading,
  sort,
  onSortChange,
  onOpenDeck,
  onLearnDeck,
  onEditDeck,
  onDeleteDeck,
  onCreateDeck,
}: DeckListSectionProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Twoje decki</h2>
        
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value as DeckSortOption)}
          className="px-3 py-2 border rounded-md bg-background text-foreground text-sm"
          disabled={isLoading}
        >
          <option value="updated_desc">Ostatnio modyfikowane</option>
          <option value="updated_asc">Najdawniej modyfikowane</option>
          <option value="created_desc">Najnowsze</option>
          <option value="created_asc">Najstarsze</option>
          <option value="name_asc">Nazwa A-Z</option>
          <option value="name_desc">Nazwa Z-A</option>
        </select>
      </div>

      {/* Loading State */}
      {isLoading && <SkeletonList count={6} />}

      {/* Empty State */}
      {!isLoading && decks.length === 0 && (
        <CTAEmptyState variant="no-decks" onPrimaryAction={onCreateDeck} />
      )}

      {/* Deck Cards Grid */}
      {!isLoading && decks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <DeckCard
              key={deck.id}
              deck={deck}
              onOpen={onOpenDeck}
              onLearn={onLearnDeck}
              onEdit={onEditDeck}
              onDelete={onDeleteDeck}
            />
          ))}
        </div>
      )}
    </div>
  );
}

