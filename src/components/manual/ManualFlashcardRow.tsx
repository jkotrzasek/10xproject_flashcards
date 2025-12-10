import { type ChangeEvent } from "react";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import type { ManualFlashcardRowViewModel, ManualFlashcardRowErrors, ManualFlashcardRowId } from "./typesManual";

// ============================================================================
// Constants
// ============================================================================

const MAX_FRONT_LENGTH = 200;
const MAX_BACK_LENGTH = 500;

// ============================================================================
// Types
// ============================================================================

interface ManualFlashcardRowProps {
  row: ManualFlashcardRowViewModel;
  errors?: ManualFlashcardRowErrors;
  onChangeFront: (id: ManualFlashcardRowId, value: string) => void;
  onChangeBack: (id: ManualFlashcardRowId, value: string) => void;
  onRemove: (id: ManualFlashcardRowId) => void;
  rowNumber: number; // Display number (1-indexed)
  canRemove: boolean; // Can this row be removed (false if it's the only row)
}

// ============================================================================
// Component
// ============================================================================

/**
 * Single flashcard row in manual creation form
 * Displays front/back textareas with character counters and validation errors
 */
export function ManualFlashcardRow({
  row,
  errors,
  onChangeFront,
  onChangeBack,
  onRemove,
  rowNumber,
  canRemove,
}: ManualFlashcardRowProps) {
  const handleFrontChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChangeFront(row.id, e.target.value);
  };

  const handleBackChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    onChangeBack(row.id, e.target.value);
  };

  const handleRemove = () => {
    onRemove(row.id);
  };

  const frontLength = row.front.trim().length;
  const backLength = row.back.trim().length;
  const hasFrontError = !!errors?.front;
  const hasBackError = !!errors?.back;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">Fiszka #{rowNumber}</Label>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
            onClick={handleRemove}
            disabled={!canRemove}
            title={canRemove ? "Usuń fiszkę" : "Nie można usunąć jedynej fiszki"}
          >
            <span className="text-sm">🗑️</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Front field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`front-${row.id}`} className="text-xs font-medium">
              Przód
            </Label>
            <span
              className={`text-xs ${
                frontLength > MAX_FRONT_LENGTH ? "text-destructive font-medium" : "text-muted-foreground"
              }`}
            >
              {frontLength}/{MAX_FRONT_LENGTH}
            </span>
          </div>
          <Textarea
            id={`front-${row.id}`}
            value={row.front}
            onChange={handleFrontChange}
            placeholder="Wpisz przód fiszki..."
            maxLength={MAX_FRONT_LENGTH}
            className="min-h-[60px] max-h-[100px] resize-none text-sm"
            aria-describedby={hasFrontError ? `front-error-${row.id}` : undefined}
            aria-invalid={hasFrontError}
          />
          {hasFrontError && (
            <p id={`front-error-${row.id}`} className="text-xs text-destructive" role="alert">
              {errors.front}
            </p>
          )}
        </div>

        {/* Back field */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={`back-${row.id}`} className="text-xs font-medium">
              Tył
            </Label>
            <span
              className={`text-xs ${
                backLength > MAX_BACK_LENGTH ? "text-destructive font-medium" : "text-muted-foreground"
              }`}
            >
              {backLength}/{MAX_BACK_LENGTH}
            </span>
          </div>
          <Textarea
            id={`back-${row.id}`}
            value={row.back}
            onChange={handleBackChange}
            placeholder="Wpisz tył fiszki..."
            maxLength={MAX_BACK_LENGTH}
            className="min-h-[80px] max-h-[150px] resize-none text-sm"
            aria-describedby={hasBackError ? `back-error-${row.id}` : undefined}
            aria-invalid={hasBackError}
          />
          {hasBackError && (
            <p id={`back-error-${row.id}`} className="text-xs text-destructive" role="alert">
              {errors.back}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
