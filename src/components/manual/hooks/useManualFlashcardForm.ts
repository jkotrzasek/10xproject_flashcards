import { useState, useCallback } from "react";
import { z } from "zod";
import type {
  ManualFlashcardRowId,
  ManualFlashcardRowViewModel,
  ManualFlashcardFormState,
  ManualFlashcardFormValues,
  ManualFlashcardFormErrors,
  ManualFlashcardRowErrors,
  ManualSaveStats,
} from "../typesManual";
import { useSaveManualFlashcards } from "./useSaveManualFlashcards";

// ============================================================================
// Validation Schema (mirrors backend validation)
// ============================================================================

const flashcardRowSchema = z.object({
  front: z
    .string()
    .trim()
    .min(1, "Pole nie może być puste")
    .max(200, "Maksymalnie 200 znaków"),
  back: z
    .string()
    .trim()
    .min(1, "Pole nie może być puste")
    .max(500, "Maksymalnie 500 znaków"),
});

// ============================================================================
// Helper Functions
// ============================================================================

function generateRowId(): ManualFlashcardRowId {
  return `row-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function createEmptyRow(): ManualFlashcardRowViewModel {
  return {
    id: generateRowId(),
    front: "",
    back: "",
  };
}

// ============================================================================
// Types
// ============================================================================

interface UseManualFlashcardFormParams {
  initialDeckId?: number | null;
  onSuccess?: (stats: ManualSaveStats) => void;
}

interface UseManualFlashcardFormReturn {
  formState: ManualFlashcardFormState;
  setDeckId: (deckId: number | null) => void;
  updateRow: (id: ManualFlashcardRowId, changes: Partial<Pick<ManualFlashcardRowViewModel, "front" | "back">>) => void;
  addRow: () => void;
  removeRow: (id: ManualFlashcardRowId) => void;
  submit: () => Promise<void>;
  reset: () => void;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Main hook for managing manual flashcard form state, validation, and submission
 */
export function useManualFlashcardForm({
  initialDeckId = null,
  onSuccess,
}: UseManualFlashcardFormParams = {}): UseManualFlashcardFormReturn {
  const { saveFlashcards, isSaving } = useSaveManualFlashcards();

  const [formState, setFormState] = useState<ManualFlashcardFormState>(() => ({
    values: {
      deckId: initialDeckId,
      rows: [createEmptyRow()],
    },
    errors: {
      rows: {},
    },
    isSubmitting: false,
    submitSucceeded: false,
  }));

  // ========================================================================
  // Validation
  // ========================================================================

  const validateRow = useCallback((row: ManualFlashcardRowViewModel): ManualFlashcardRowErrors | null => {
    try {
      flashcardRowSchema.parse({ front: row.front, back: row.back });
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: ManualFlashcardRowErrors = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as "front" | "back";
          errors[field] = err.message;
        });
        return errors;
      }
      return null;
    }
  }, []);

  const validateForm = useCallback(
    (values: ManualFlashcardFormValues): { isValid: boolean; errors: ManualFlashcardFormErrors } => {
      const errors: ManualFlashcardFormErrors = {
        rows: {},
      };

      let hasValidRow = false;

      values.rows.forEach((row) => {
        const rowErrors = validateRow(row);
        if (rowErrors) {
          errors.rows[row.id] = rowErrors;
        } else {
          hasValidRow = true;
        }
      });

      if (!hasValidRow) {
        errors.form = "Przynajmniej jedna fiszka musi być poprawnie wypełniona";
      }

      return {
        isValid: hasValidRow && Object.keys(errors.rows).length === 0,
        errors,
      };
    },
    [validateRow]
  );

  // ========================================================================
  // Actions
  // ========================================================================

  const setDeckId = useCallback((deckId: number | null) => {
    setFormState((prev) => ({
      ...prev,
      values: {
        ...prev.values,
        deckId,
      },
      errors: {
        ...prev.errors,
        deckId: undefined,
      },
    }));
  }, []);

  const updateRow = useCallback(
    (id: ManualFlashcardRowId, changes: Partial<Pick<ManualFlashcardRowViewModel, "front" | "back">>) => {
      setFormState((prev) => {
        const updatedRows = prev.values.rows.map((row) =>
          row.id === id ? { ...row, ...changes } : row
        );

        // Clear errors for this row when user types
        const { [id]: _, ...remainingErrors } = prev.errors.rows;

        return {
          ...prev,
          values: {
            ...prev.values,
            rows: updatedRows,
          },
          errors: {
            ...prev.errors,
            rows: remainingErrors,
            form: undefined, // Clear global error
          },
        };
      });
    },
    []
  );

  const addRow = useCallback(() => {
    setFormState((prev) => {
      // Validate last row before adding a new one
      const lastRow = prev.values.rows[prev.values.rows.length - 1];
      if (lastRow) {
        const rowErrors = validateRow(lastRow);
        if (rowErrors) {
          // Don't add new row, just set errors for last row
          return {
            ...prev,
            errors: {
              ...prev.errors,
              rows: {
                ...prev.errors.rows,
                [lastRow.id]: rowErrors,
              },
            },
          };
        }
      }

      // Last row is valid or no rows exist - add new row
      return {
        ...prev,
        values: {
          ...prev.values,
          rows: [...prev.values.rows, createEmptyRow()],
        },
      };
    });
  }, [validateRow]);

  const removeRow = useCallback((id: ManualFlashcardRowId) => {
    setFormState((prev) => {
      // Don't remove if it's the last row - clear it instead
      if (prev.values.rows.length === 1) {
        return {
          ...prev,
          values: {
            ...prev.values,
            rows: [createEmptyRow()],
          },
          errors: {
            ...prev.errors,
            rows: {},
          },
        };
      }

      const updatedRows = prev.values.rows.filter((row) => row.id !== id);
      const { [id]: _, ...remainingErrors } = prev.errors.rows;

      return {
        ...prev,
        values: {
          ...prev.values,
          rows: updatedRows,
        },
        errors: {
          ...prev.errors,
          rows: remainingErrors,
        },
      };
    });
  }, []);

  const submit = useCallback(async () => {
    // Validate
    const { isValid, errors } = validateForm(formState.values);

    if (!isValid) {
      setFormState((prev) => ({
        ...prev,
        errors,
      }));
      return;
    }

    // Filter out empty rows
    const validRows = formState.values.rows.filter(
      (row) => row.front.trim() !== "" || row.back.trim() !== ""
    );

    if (validRows.length === 0) {
      setFormState((prev) => ({
        ...prev,
        errors: {
          ...prev.errors,
          form: "Przynajmniej jedna fiszka musi być wypełniona",
        },
      }));
      return;
    }

    // Submit
    setFormState((prev) => ({
      ...prev,
      isSubmitting: true,
      errors: { rows: {} },
    }));

    try {
      const stats = await saveFlashcards(validRows, formState.values.deckId);

      if (stats.saved > 0) {
        setFormState((prev) => ({
          values: {
            deckId: prev.values.deckId, // Keep selected deck
            rows: [createEmptyRow()], // Reset to one empty row
          },
          errors: { rows: {} },
          isSubmitting: false,
          submitSucceeded: true,
        }));

        onSuccess?.(stats);
      } else {
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          errors: {
            ...prev.errors,
            form: "Nie udało się zapisać żadnej fiszki",
          },
        }));
      }
    } catch (err) {
      setFormState((prev) => ({
        ...prev,
        isSubmitting: false,
        errors: {
          ...prev.errors,
          form: err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd",
        },
      }));
    }
  }, [formState.values, validateForm, saveFlashcards, onSuccess]);

  const reset = useCallback(() => {
    setFormState({
      values: {
        deckId: initialDeckId,
        rows: [createEmptyRow()],
      },
      errors: { rows: {} },
      isSubmitting: false,
      submitSucceeded: false,
    });
  }, [initialDeckId]);

  return {
    formState: {
      ...formState,
      isSubmitting: formState.isSubmitting || isSaving,
    },
    setDeckId,
    updateRow,
    addRow,
    removeRow,
    submit,
    reset,
  };
}

