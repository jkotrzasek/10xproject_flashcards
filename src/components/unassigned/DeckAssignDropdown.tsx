import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import type { DeckOptionVM } from "../UnassignedDeckPage";

// ============================================================================
// Types
// ============================================================================

interface DeckAssignDropdownProps {
  value?: number;
  options: DeckOptionVM[];
  placeholder?: string;
  disabled: boolean;
  error?: string;
  onChange: (deckId: number) => void;
  flashcardId: number;
}

// ============================================================================
// Component
// ============================================================================

export function DeckAssignDropdown({
  value,
  options,
  placeholder = "Wybierz deck...",
  disabled,
  error,
  onChange,
  flashcardId,
}: DeckAssignDropdownProps) {
  const handleValueChange = (newValue: string) => {
    const deckId = parseInt(newValue, 10);
    if (!isNaN(deckId)) {
      onChange(deckId);
    }
  };

  const currentValue = value !== undefined ? value.toString() : undefined;
  const hasOptions = options.length > 0;
  const isDisabled = disabled || !hasOptions;

  return (
    <div className="space-y-1">
      <Label htmlFor={`deck-assign-${flashcardId}`} className="text-xs font-medium">
        Przypisz do decku
      </Label>
      <Select 
        value={currentValue} 
        onValueChange={handleValueChange} 
        disabled={isDisabled}
      >
        <SelectTrigger 
          id={`deck-assign-${flashcardId}`} 
          className="w-full text-sm"
          aria-describedby={error ? `deck-error-${flashcardId}` : undefined}
          aria-invalid={!!error}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((deck) => (
            <SelectItem key={deck.id} value={deck.id.toString()}>
              {deck.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Helper text when no decks */}
      {!hasOptions && !disabled && (
        <p className="text-xs text-muted-foreground">
          Brak decków – utwórz deck w Dashboardzie
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={`deck-error-${flashcardId}`}
          className="text-xs text-destructive"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

