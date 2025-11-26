import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { DeckAssignDropdown } from "./DeckAssignDropdown";
import type { UnassignedFlashcardVM, DeckOptionVM } from "../UnassignedDeckPage";

// ============================================================================
// Types
// ============================================================================

interface UnassignedFlashcardItemProps {
  item: UnassignedFlashcardVM;
  deckOptions: DeckOptionVM[];
  hasDecks: boolean;
  onAssign: (flashcardId: number, deckId: number) => void | Promise<void>;
  onDelete: (flashcardId: number) => void | Promise<void>;
  isAssigning: boolean;
  error?: string;
}

// ============================================================================
// Component
// ============================================================================

export function UnassignedFlashcardItem({
  item,
  deckOptions,
  hasDecks,
  onAssign,
  onDelete,
  isAssigning,
  error,
}: UnassignedFlashcardItemProps) {
  const handleAssign = (deckId: number) => {
    onAssign(item.id, deckId);
  };

  const handleDelete = () => {
    onDelete(item.id);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium">
              {item.spaceRepetition}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {item.source}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={isAssigning}
              title="Usuń"
            >
              <span className="text-sm">🗑️</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Front field */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Przód
          </Label>
          <p className="text-sm whitespace-pre-wrap">{item.front}</p>
        </div>

        {/* Back field */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Tył
          </Label>
          <p className="text-sm whitespace-pre-wrap">{item.back}</p>
        </div>

        {/* Deck Assign Dropdown */}
        <div className="pt-2">
          <DeckAssignDropdown
            flashcardId={item.id}
            options={deckOptions}
            placeholder="Wybierz deck..."
            disabled={isAssigning || !hasDecks}
            error={error}
            onChange={handleAssign}
          />
        </div>

        {/* Assigning state */}
        {isAssigning && (
          <div className="text-xs text-muted-foreground">
            Przypisywanie...
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 text-xs text-muted-foreground">
        {item.lastRepetitionLabel} • {item.createdAtLabel} • {item.updatedAtLabel}
      </CardFooter>
    </Card>
  );
}

