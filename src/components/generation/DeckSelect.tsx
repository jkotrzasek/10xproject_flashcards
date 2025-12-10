import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import type { DeckDto } from "../../types";

// ============================================================================
// Types
// ============================================================================

interface DeckSelectProps {
  decks: DeckDto[];
  value?: number | null;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  compact?: boolean; // If true, renders without label and helper text
}

// ============================================================================
// Component
// ============================================================================

export function DeckSelect({ decks, value, onChange, disabled, compact = false }: DeckSelectProps) {
  const handleValueChange = (newValue: string) => {
    if (newValue === "none") {
      onChange(null);
    } else {
      onChange(parseInt(newValue, 10));
    }
  };

  const currentValue = value === null || value === undefined ? "none" : value.toString();

  if (compact) {
    return (
      <Select value={currentValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger id="deck-select" className="w-full">
          <SelectValue placeholder="Wybierz deck..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bez decku</SelectItem>
          {decks.map((deck) => (
            <SelectItem key={deck.id} value={deck.id.toString()}>
              {deck.name} ({deck.flashcard_count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="deck-select" className="text-sm font-medium">
        Wybierz deck (opcjonalnie)
      </Label>
      <Select value={currentValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger id="deck-select" className="w-full">
          <SelectValue placeholder="Wybierz deck..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Bez decku</SelectItem>
          {decks.map((deck) => (
            <SelectItem key={deck.id} value={deck.id.toString()}>
              {deck.name} ({deck.flashcard_count} fiszek)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        Fiszki można zapisać bez przypisania do decku i przypisać je później.
      </p>
    </div>
  );
}
