import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import type { DeckDto } from "../types";

// ============================================================================
// Types
// ============================================================================

interface DeckCardViewModel extends DeckDto {
  updatedLabel: string;
  isMutating: boolean;
}

interface DeckFormValues {
  name: string;
}

interface UpdateDeckDialogProps {
  open: boolean;
  deck: DeckCardViewModel | undefined;
  onClose: () => void;
  onSubmit: (values: DeckFormValues) => Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

export function UpdateDeckDialog({ open, deck, onClose, onSubmit }: UpdateDeckDialogProps) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill nazwy przy otwieraniu dialogu
  useEffect(() => {
    if (open && deck) {
      setName(deck.name);
      setError(null);
    }
  }, [open, deck]);

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

    // Sprawdź czy nazwa się zmieniła
    if (deck && name.trim() === deck.name) {
      setError("Nazwa jest taka sama");
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
        setError("Nie udało się zaktualizować decku. Spróbuj ponownie.");
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

  if (!deck) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj deck</DialogTitle>
          <DialogDescription>
            Zmień nazwę swojego decku. Zmiana nazwy nie wpłynie na przypisane fiszki.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deck-name-edit">Nazwa decku</Label>
              <Input
                id="deck-name-edit"
                placeholder="np. Angielski - czasowniki"
                value={name}
                onChange={handleNameChange}
                disabled={isSubmitting}
                maxLength={30}
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

