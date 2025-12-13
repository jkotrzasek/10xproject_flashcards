import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Button } from "../ui/button";
import type { DeckDto } from "../../types";

// ============================================================================
// Types
// ============================================================================

interface DeckCardViewModel extends DeckDto {
  updatedLabel: string;
  isMutating: boolean;
}

interface DeckCardProps {
  deck: DeckCardViewModel;
  onOpen: (deckId: number) => void;
  onLearn: (deckId: number) => void;
  onEdit: (deck: DeckCardViewModel) => void;
  onDelete: (deck: DeckCardViewModel) => void;
}

// ============================================================================
// Component
// ============================================================================

export function DeckCard({ deck, onOpen, onLearn, onEdit, onDelete }: DeckCardProps) {
  const handleOpenClick = () => {
    onOpen(deck.id);
  };

  const handleLearnClick = () => {
    onLearn(deck.id);
  };

  const handleEditClick = () => {
    onEdit(deck);
  };

  const handleDeleteClick = () => {
    onDelete(deck);
  };

  const isLearnDisabled = deck.flashcard_count === 0 || deck.isMutating;

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`deck-card-${deck.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            className="text-lg font-semibold text-foreground cursor-pointer hover:underline text-left"
            onClick={handleOpenClick}
            data-testid="deck-card-name"
          >
            {deck.name}
          </button>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleEditClick}
              disabled={deck.isMutating}
              title="Edytuj"
              data-testid="edit-deck-button"
            >
              <span className="text-sm">✏️</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDeleteClick}
              disabled={deck.isMutating}
              title="Usuń"
              data-testid="delete-deck-button"
            >
              <span className="text-sm">🗑️</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-sm text-muted-foreground">
          {deck.flashcard_count}{" "}
          {deck.flashcard_count === 1
            ? "fiszka"
            : deck.flashcard_count > 1 && deck.flashcard_count < 5
              ? "fiszki"
              : "fiszek"}
        </p>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">
        <div className="flex gap-2 w-full">
          <Button
            onClick={handleLearnClick}
            disabled={isLearnDisabled}
            className="flex-1 h-12"
            size="sm"
            data-testid="learn-deck-button"
          >
            Ucz się
          </Button>
        </div>

        <p className="text-xs text-muted-foreground w-full">{deck.updatedLabel}</p>
      </CardFooter>
    </Card>
  );
}
