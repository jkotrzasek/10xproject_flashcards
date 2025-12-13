import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

// ============================================================================
// Types
// ============================================================================

interface DeckFormValues {
  name: string;
}

interface CreateDeckDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: DeckFormValues) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function CreateDeckDialog({ open, onClose, onSubmit }: CreateDeckDialogProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setName("");
    setError(null);
    onClose();
  };

  const validateName = (value: string): string | null => {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return "Nazwa decku nie może być pusta";
    }

    if (trimmed.length < 1 || trimmed.length > 30) {
      return "Nazwa decku musi mieć od 1 do 30 znaków";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateName(name);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({ name: name.trim() });
      // Po sukcesie dialog zostanie zamknięty przez rodzica
      setName("");
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Nie udało się stworzyć decku. Spróbuj ponownie.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    if (error) {
      setError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent data-testid="create-deck-dialog">
        <DialogHeader>
          <DialogTitle>Stwórz nowy deck</DialogTitle>
          <DialogDescription>
            Nadaj nazwę swojemu nowemu deckowi. Będziesz mógł później przypisać do niego fiszki.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name">Nazwa decku</Label>
              <Input
                id="deck-name"
                placeholder="np. Angielski - czasowniki"
                value={name}
                onChange={handleNameChange}
                disabled={isSubmitting}
                maxLength={30}
                data-testid="deck-name-input"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              data-testid="cancel-deck-button"
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="save-deck-button">
              {isSubmitting ? "Tworzenie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
