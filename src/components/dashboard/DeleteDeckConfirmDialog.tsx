import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import type { DeckDto } from "../../types";

// ============================================================================
// Types
// ============================================================================

interface DeckCardViewModel extends DeckDto {
  updatedLabel: string;
  isMutating: boolean;
}

interface DeleteDeckConfirmDialogProps {
  open: boolean;
  deck: DeckCardViewModel | undefined;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function DeleteDeckConfirmDialog({ open, deck, onClose, onConfirm }: DeleteDeckConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setConfirmText("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!deck) return;

    // Wymaga wpisania nazwy decku jako potwierdzenie
    if (confirmText.trim() !== deck.name) {
      setError("Nazwa się nie zgadza. Wpisz dokładnie nazwę decku.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onConfirm();
      // Po sukcesie dialog zostanie zamknięty przez rodzica
      setConfirmText("");
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się usunąć decku. Spróbuj ponownie.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmText(e.target.value);
    if (error) {
      setError(null);
    }
  };

  if (!deck) return null;

  const flashcardText =
    deck.flashcard_count === 1
      ? "1 fiszka"
      : deck.flashcard_count > 1 && deck.flashcard_count < 5
        ? `${deck.flashcard_count} fiszki`
        : `${deck.flashcard_count} fiszek`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usuń deck</DialogTitle>
          <DialogDescription>
            Ta operacja jest nieodwracalna i spowoduje trwałe usunięcie decku oraz wszystkich przypisanych do niego
            fiszek.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Ostrzeżenie */}
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
              <p className="text-sm font-semibold text-destructive mb-2">⚠️ Uwaga! Zostanie usunięte:</p>
              <ul className="text-sm text-destructive/90 list-disc list-inside space-y-1">
                <li>
                  Deck: <strong>{deck.name}</strong>
                </li>
                <li>{flashcardText} przypisanych do tego decku</li>
              </ul>
            </div>

            {/* Pole potwierdzenia */}
            <div className="space-y-2">
              <Label htmlFor="confirm-name">
                Wpisz nazwę decku <strong>{deck.name}</strong> aby potwierdzić:
              </Label>
              <Input
                id="confirm-name"
                placeholder={deck.name}
                value={confirmText}
                onChange={handleConfirmTextChange}
                disabled={isSubmitting}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Anuluj
            </Button>
            <Button type="submit" variant="destructive" disabled={isSubmitting}>
              {isSubmitting ? "Usuwanie..." : "Usuń deck"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
