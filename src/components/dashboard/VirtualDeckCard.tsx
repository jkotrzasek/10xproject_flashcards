import { Card, CardContent, CardHeader } from "../ui/card";

// ============================================================================
// Types
// ============================================================================

interface VirtualDeckCardProps {
  count: number;
  onOpen: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function VirtualDeckCard({ count, onOpen }: VirtualDeckCardProps) {
  if (count === 0) {
    return null;
  }

  return (
    <Card 
      className="bg-muted/50 hover:bg-muted hover:shadow-md transition-all cursor-pointer" 
      onClick={onOpen}
    >
      <CardHeader className="pb-1 justify-center">
        <h3 className="text-lg font-semibold text-foreground">Nieprzypisane</h3>
      </CardHeader>
      
      <CardContent className="pb-1">
        <p className=" text-muted-foreground text-center">
          Posiadasz {count} {count === 1 ? "fiszka" 
          : count > 1 && count < 5 ? "fiszki" 
          : "fiszek"} bez decku
        </p>
      </CardContent>
    </Card>
  );
}

