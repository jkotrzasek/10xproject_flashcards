import type { DeckFlashcardVM } from "../DeckDetailsPage";
import { Button } from "../ui/button";
import { DeckFlashcardItem } from "./DeckFlashcardItem";
import { DeckFlashcardSkeleton } from "./DeckFlashcardSkeleton";

// ============================================================================
// Types
// ============================================================================

interface DeckFlashcardListProps {
  items: DeckFlashcardVM[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (flashcardId: number) => void;
  onDelete: (flashcardId: number) => void;
  startIndex: number; // numer pierwszego widocznego elementu dla paginacji
}

// ============================================================================
// Component
// ============================================================================

export function DeckFlashcardList({
  items,
  isInitialLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
  startIndex,
}: DeckFlashcardListProps) {
  // Loading state - initial loading
  if (isInitialLoading) {
    return <DeckFlashcardSkeleton count={6} />;
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Brak fiszek do wyświetlenia
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Flashcard Items - 2 per row */}
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item, index) => (
          <DeckFlashcardItem
            key={item.id}
            item={item}
            itemNumber={startIndex + index + 1}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Ładowanie..." : "Załaduj więcej"}
          </Button>
        </div>
      )}

      {/* Loading More State */}
      {isLoadingMore && <DeckFlashcardSkeleton count={2} />}
    </div>
  );
}

