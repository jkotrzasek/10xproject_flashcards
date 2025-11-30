import { toast } from "sonner";
import { useManualFlashcardForm } from "./hooks/useManualFlashcardForm";
import { DeckSelect } from "./DeckSelect";
import { ManualFlashcardRow } from "./ManualFlashcardRow";
import { Button } from "../ui/button";
import type { DeckOptionViewModel } from "./typesManual";

// ============================================================================
// Types
// ============================================================================

interface ManualFlashcardFormProps {
  deckOptions: DeckOptionViewModel[];
  initialDeckId?: number | null;
  onSuccess?: () => void; // Callback for successful save (e.g., to refetch decks)
}

// ============================================================================
// Component
// ============================================================================

/**
 * Main form for manual flashcard creation
 * Handles multiple flashcard rows with validation and submission
 */
export function ManualFlashcardForm({ deckOptions, initialDeckId, onSuccess }: ManualFlashcardFormProps) {
  const { formState, setDeckId, updateRow, addRow, removeRow, submit } = useManualFlashcardForm({
    initialDeckId,
    onSuccess: (stats) => {
      if (stats.saved === stats.attempted) {
        toast.success(`Zapisano ${stats.saved} ${stats.saved === 1 ? "fiszkę" : "fiszek"}`);
      } else if (stats.saved > 0) {
        toast.warning(`Zapisano ${stats.saved} z ${stats.attempted} fiszek`);
      }
      // Call parent callback to refetch decks
      onSuccess?.();
    },
  });

  const { values, errors, isSubmitting } = formState;
  const canRemoveRows = values.rows.length > 1;
  const hasGlobalError = !!errors.form;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  const handleAddRow = () => {
    addRow();
    // Scroll to bottom after adding new row (only if validation passed)
    // Small delay to let state update
    setTimeout(() => {
      const lastRowIndex = values.rows.length - 1;
      const lastRowId = values.rows[lastRowIndex]?.id;
      // Check if we actually added a new row (validation passed)
      if (lastRowId && !errors.rows[lastRowId]) {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }
    }, 100);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Global form error */}
      {hasGlobalError && (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive" role="alert">
          <p className="text-sm font-medium">{errors.form}</p>
        </div>
      )}

      {/* Deck selector */}
      <div className="rounded-lg border border-border bg-card p-4">
        <DeckSelect
          options={deckOptions}
          value={values.deckId}
          onChange={setDeckId}
          error={errors.deckId}
          disabled={isSubmitting}
        />
      </div>

      {/* Flashcard rows */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Fiszki</h2>
          <span className="text-sm text-muted-foreground">
            {values.rows.length} {values.rows.length === 1 ? "fiszka" : "fiszek"}
          </span>
        </div>

        {/* Grid of flashcard rows - 2 per row */}
        <div className="grid gap-4 md:grid-cols-2">
          {values.rows.map((row, index) => (
            <ManualFlashcardRow
              key={row.id}
              row={row}
              errors={errors.rows[row.id]}
              onChangeFront={(id, value) => updateRow(id, { front: value })}
              onChangeBack={(id, value) => updateRow(id, { back: value })}
              onRemove={removeRow}
              rowNumber={index + 1}
              canRemove={canRemoveRows}
            />
          ))}
        </div>

        {/* Add another flashcard button */}
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleAddRow}
            disabled={isSubmitting}
            className="gap-2"
          >
            <span className="text-lg">➕</span>
            Dodaj kolejną fiszkę
          </Button>
        </div>
      </div>

      {/* Submit button - prominent and user-friendly */}
      <div className="sticky bottom-4 z-10 flex justify-center">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || values.rows.length === 0}
          className="min-w-[200px] text-base font-semibold"
        >
          {isSubmitting ? "Zapisywanie..." : "💾 Zapisz fiszki"}
        </Button>
      </div>

      {/* Loading state overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-base font-medium">Zapisywanie fiszek...</p>
          </div>
        </div>
      )}
    </form>
  );
}

