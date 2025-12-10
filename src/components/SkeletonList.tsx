import { Card, CardContent, CardFooter, CardHeader } from "./ui/card";

// ============================================================================
// Types
// ============================================================================

interface SkeletonListProps {
  count?: number;
}

// ============================================================================
// Component
// ============================================================================

export function SkeletonList({ count = 6 }: SkeletonListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(count)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="pb-3">
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 pt-0">
            <div className="flex gap-2 w-full">
              <div className="h-9 bg-muted rounded flex-1"></div>
              <div className="h-9 bg-muted rounded flex-1"></div>
            </div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
