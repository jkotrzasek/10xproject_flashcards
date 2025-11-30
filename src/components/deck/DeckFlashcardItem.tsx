import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import type { DeckFlashcardVM } from "../DeckDetailsPage";

// ============================================================================
// Types
// ============================================================================

interface DeckFlashcardItemProps {
  item: DeckFlashcardVM;
  itemNumber: number; // numer porządkowy fiszki na liście (1-x)
  onEdit: (flashcardId: number) => void;
  onDelete: (flashcardId: number) => void;
}

// ============================================================================
// Component
// ============================================================================

export function DeckFlashcardItem({
  item,
  itemNumber,
  onEdit,
  onDelete,
}: DeckFlashcardItemProps) {
  const handleEdit = () => {
    onEdit(item.id);
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
              className="h-7 w-7 p-0"
              onClick={handleEdit}
              disabled={item.isDeleting}
              title="Edytuj"
            >
              <span className="text-sm">✏️</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={item.isDeleting}
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
          <p className="text-sm whitespace-pre-wrap break-words">{item.front}</p>
        </div>

        {/* Back field */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Tył
          </Label>
          <p className="text-sm whitespace-pre-wrap break-words">{item.back}</p>
        </div>

        {/* Deleting state */}
        {item.isDeleting && (
          <div className="text-xs text-muted-foreground">
            Usuwanie...
          </div>
        )}

        {/* Error state */}
        {item.error && (
          <div className="text-xs text-destructive">
            {item.error}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-1 w-full">
          <span className="font-medium text-foreground">#{itemNumber}</span>
          <span>•</span>
          {item.lastRepetitionLabel && (
            <>
              <span>{item.lastRepetitionLabel}</span>
              <span>•</span>
            </>
          )}
          <span>Utworzono: {item.createdAtLabel}</span>
          <span>•</span>
          <span>Zaktualizowano: {item.updatedAtLabel}</span>
        </div>
      </CardFooter>
    </Card>
  );
}

