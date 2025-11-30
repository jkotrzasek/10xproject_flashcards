// ============================================================================
// Frontend ViewModels for Manual Flashcard Creation
// These types represent the client-side state and structure
// ============================================================================

/**
 * Deck option for selector - includes "Nieprzypisane" (null) option
 */
export interface DeckOptionViewModel {
  id: number | null; // null = "Nieprzypisane"
  label: string;
  flashcardCount?: number;
}

/**
 * Unique identifier for a flashcard row in the form
 */
export type ManualFlashcardRowId = string;

/**
 * Single flashcard row in the manual form
 */
export interface ManualFlashcardRowViewModel {
  id: ManualFlashcardRowId;
  front: string;
  back: string;
}

/**
 * Validation errors for a single flashcard row
 */
export interface ManualFlashcardRowErrors {
  front?: string;
  back?: string;
}

/**
 * Form values for manual flashcard creation
 */
export interface ManualFlashcardFormValues {
  deckId: number | null;
  rows: ManualFlashcardRowViewModel[];
}

/**
 * Form errors for manual flashcard creation
 */
export interface ManualFlashcardFormErrors {
  deckId?: string;
  rows: Record<ManualFlashcardRowId, ManualFlashcardRowErrors>;
  form?: string; // Global form error
}

/**
 * Complete form state including values, errors, and submission state
 */
export interface ManualFlashcardFormState {
  values: ManualFlashcardFormValues;
  errors: ManualFlashcardFormErrors;
  isSubmitting: boolean;
  submitSucceeded: boolean;
}

/**
 * Statistics for save operation
 */
export interface ManualSaveStats {
  attempted: number;
  saved: number;
  failed: number;
}

