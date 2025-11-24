// ============================================================================
// Frontend ViewModels for Generator
// These extend the base DTOs with client-side state and computed properties
// ============================================================================

/**
 * Client-side representation of a flashcard proposal from AI
 * Includes local tracking, edit state, and validation errors
 */
export interface FlashcardProposalVM {
  id: number; // Index-based ID for React keys
  index: number; // Original position in generation results (same as id)
  originalFront: string;
  originalBack: string;
  front: string; // Current editable value
  back: string; // Current editable value
  accepted: boolean;
  isEdited: boolean; // Computed: front !== originalFront || back !== originalBack
  errors?: {
    front?: string;
    back?: string;
  };
  savingState?: "idle" | "saving" | "saved" | "error";
  errorCode?: string; // From API save, if applicable
}

/**
 * Client-side session state for generation
 */
export interface GenerationSessionVM {
  sessionId: number;
  status: "idle" | "generating" | "ready" | "error";
  generatedTotal: number;
  acceptedTotal: number; // Number accepted (for PATCH)
  error?: {
    message: string;
    code?: string;
  };
}

/**
 * Client-side limits state with computed exhausted flag
 */
export interface LimitsVM {
  dailyLimit: number;
  usedToday: number;
  remaining: number;
  isExhausted: boolean; // Computed: remaining <= 0
}

/**
 * Statistics for partial save operations
 */
export interface SaveStats {
  attempted: number;
  saved: number;
  failed: number;
  savedIds: number[]; // IDs of successfully saved proposals
  failedIds: number[]; // IDs of failed proposals
}

