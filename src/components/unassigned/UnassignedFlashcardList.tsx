import type { UnassignedFlashcardVM, DeckOptionVM } from "../UnassignedDeckPage";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { UnassignedFlashcardItem } from "./UnassignedFlashcardItem";

// ============================================================================
// Types
// ============================================================================

interface UnassignedFlashcardListProps {
  items: UnassignedFlashcardVM[];
  isInitialLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onAssign: (flashcardId: number, deckId: number) => void | Promise<void>;
  onDelete: (flashcardId: number) => void | Promise<void>;
  deckOptions: DeckOptionVM[];
  hasDecks: boolean;
}

// ============================================================================
// Helper Components
// ============================================================================

function FlashcardSkeleton() {
  return (
    <Card className="animate-pulse">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 bg-muted rounded"></div>
          <div className="h-5 w-16 bg-muted rounded"></div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className="h-3 w-12 bg-muted rounded"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
        </div>
        <div className="space-y-1">
          <div className="h-3 w-12 bg-muted rounded"></div>
          <div className="h-4 w-full bg-muted rounded"></div>
          <div className="h-4 w-3/4 bg-muted rounded"></div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <div className="h-3 w-2/3 bg-muted rounded"></div>
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Component
// ============================================================================

export function UnassignedFlashcardList({
  items,
  isInitialLoading,
  isLoadingMore,
  hasMore,
  onLoadMore,
  onAssign,
  onDelete,
  deckOptions,
  hasDecks,
}: UnassignedFlashcardListProps) {
  // Loading state - initial loading
  if (isInitialLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, idx) => (
          <FlashcardSkeleton key={idx} />
        ))}
      </div>
    );
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
        {items.map((item) => (
          <UnassignedFlashcardItem
            key={item.id}
            item={item}
            deckOptions={deckOptions}
            hasDecks={hasDecks}
            onAssign={onAssign}
            onDelete={onDelete}
            isAssigning={item.isAssigning}
            error={item.assignError}
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
      {isLoadingMore && (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, idx) => (
            <FlashcardSkeleton key={idx} />
          ))}
        </div>
      )}
    </div>
  );
}

