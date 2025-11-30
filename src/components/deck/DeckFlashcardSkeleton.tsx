import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";

// ============================================================================
// Types
// ============================================================================

interface DeckFlashcardSkeletonProps {
  count?: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Skeleton dla listy fiszek w widoku szczegółów decku
 * Używa układu 2-kolumnowego (md:grid-cols-2)
 */
export function DeckFlashcardSkeleton({ count = 6 }: DeckFlashcardSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className="animate-pulse">
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
      ))}
    </div>
  );
}

