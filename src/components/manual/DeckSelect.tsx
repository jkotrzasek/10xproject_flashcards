import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import type { DeckOptionViewModel } from "./typesManual";

// ============================================================================
// Types
// ============================================================================

interface DeckSelectProps {
  options: DeckOptionViewModel[];
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Reusable deck selector for manual flashcard creation
 * Always includes "Nieprzypisane" option with null value
 */
export function DeckSelect({ options, value, onChange, error, disabled = false }: DeckSelectProps) {
  const handleValueChange = (newValue: string) => {
    if (newValue === "null") {
      onChange(null);
    } else {
      onChange(parseInt(newValue, 10));
    }
  };

  const currentValue = value === null ? "null" : value.toString();

  return (
    <div className="space-y-2">
      <Label htmlFor="deck-select" className="text-sm font-medium">
        Wybierz deck (opcjonalnie)
      </Label>
      <Select value={currentValue} onValueChange={handleValueChange} disabled={disabled}>
        <SelectTrigger
          id="deck-select"
          className="w-full"
          aria-invalid={!!error}
          aria-describedby={error ? "deck-select-error" : "deck-select-description"}
        >
          <SelectValue placeholder="Wybierz deck..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem
              key={option.id === null ? "null" : option.id}
              value={option.id === null ? "null" : option.id.toString()}
            >
              {option.label}
              {option.flashcardCount !== undefined && option.id !== null && ` (${option.flashcardCount})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {error ? (
        <p id="deck-select-error" className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p id="deck-select-description" className="text-xs text-muted-foreground">
          Fiszki można zapisać bez przypisania do decku i przypisać je później.
        </p>
      )}
    </div>
  );
}
