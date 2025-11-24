import { useState, useEffect, type FormEvent, type ChangeEvent, type FocusEvent } from "react";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";

// ============================================================================
// Constants
// ============================================================================

const MIN_LENGTH = 1000;
const MAX_LENGTH = 10000;

// ============================================================================
// Types
// ============================================================================

interface AIInputFormProps {
  remaining: number;
  onGenerate: (input: string) => Promise<void>;
  isGenerating: boolean;
  error?: string;
  hasUnsavedProposals: boolean;
  shouldClear?: boolean; // Signal to clear the form
  onCleared?: () => void; // Callback when cleared
}

// ============================================================================
// Component
// ============================================================================

export function AIInputForm({
  remaining,
  onGenerate,
  isGenerating,
  error,
  hasUnsavedProposals,
  shouldClear = false,
  onCleared,
}: AIInputFormProps) {
  const [inputText, setInputText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Clear form when shouldClear is true
  useEffect(() => {
    if (shouldClear && inputText !== "") {
      setInputText("");
      setValidationError(null);
      onCleared?.();
    }
  }, [shouldClear, inputText, onCleared]);

  const currentLength = inputText.length;
  const isLimitExhausted = remaining === 0;
  const isValidLength = currentLength >= MIN_LENGTH && currentLength <= MAX_LENGTH;

  const canGenerate =
    isValidLength && !isLimitExhausted && !isGenerating && !hasUnsavedProposals;

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputText(value);

    // Clear validation error when user starts typing and corrects the issue
    if (validationError) {
      const length = value.length;
      if (length >= MIN_LENGTH && length <= MAX_LENGTH) {
        setValidationError(null);
      }
    }
  };

  const handleBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    const length = e.target.value.length;

    // Only validate if user has entered some text
    if (length === 0) {
      setValidationError(null);
      return;
    }

    if (length < MIN_LENGTH) {
      setValidationError(`Tekst jest za krótki. Minimum ${MIN_LENGTH.toLocaleString()} znaków.`);
    } else if (length > MAX_LENGTH) {
      setValidationError(`Tekst jest za długi. Maksimum ${MAX_LENGTH.toLocaleString()} znaków.`);
    } else {
      setValidationError(null);
    }
  };

  const handleGenerate = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Validate on submit
    if (currentLength < MIN_LENGTH) {
      setValidationError(`Tekst jest za krótki. Minimum ${MIN_LENGTH} znaków.`);
      return;
    }

    if (currentLength > MAX_LENGTH) {
      setValidationError(`Tekst jest za długi. Maksimum ${MAX_LENGTH} znaków.`);
      return;
    }

    if (!canGenerate) return;

    setValidationError(null);
    await onGenerate(inputText);
  };

  const handleFormSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="input-text" className="text-base font-medium">
            Wpisz lub wklej tekst do wygenerowania fiszek
          </Label>
          <span className="text-sm text-muted-foreground">
            Wymagane: {MIN_LENGTH.toLocaleString()}-{MAX_LENGTH.toLocaleString()} znaków
          </span>
        </div>
        <Textarea
          id="input-text"
          value={inputText}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Wklej tutaj tekst (1000-10000 znaków)..."
          className="min-h-[50px] max-h-[80px] resize-none"
          disabled={isGenerating}
          aria-describedby={validationError ? "input-error" : "char-counter"}
          aria-invalid={!!validationError}
        />
        <div className="flex items-center justify-between text-sm">
          <div id="char-counter" className="text-muted-foreground">
            Aktualna długość: {currentLength.toLocaleString()} znaków
          </div>
        </div>
        {validationError && (
          <div
            id="input-error"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {validationError}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      {isLimitExhausted && (
        <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700" role="alert">
          Osiągnięto dzienny limit generacji. Spróbuj ponownie jutro.
        </div>
      )}

      {hasUnsavedProposals && (
        <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-700" role="alert">
          Zapisz lub odrzuć obecne propozycje przed wygenerowaniem nowych fiszek.
        </div>
      )}

      {!hasUnsavedProposals && (
        <Button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate}
          className="w-full"
          size="lg"
        >
          {isGenerating ? "Generowanie..." : "Generuj fiszki"}
        </Button>
      )}
    </form>
  );
}

