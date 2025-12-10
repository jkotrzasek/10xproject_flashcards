import { Button } from "../ui/button";
import type { ReviewResponse } from "./typesLearn";

// ============================================================================
// Types
// ============================================================================

interface ReviewControlsProps {
  disabled: boolean;
  isBackVisible: boolean;
  onAnswer: (response: ReviewResponse) => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Review controls component
 * Provides OK/NOK buttons for flashcard review
 */
export function ReviewControls({ disabled, isBackVisible, onAnswer }: ReviewControlsProps) {
  const isDisabled = disabled || !isBackVisible;

  return (
    <div className="flex gap-4">
      <Button variant="destructive" size="lg" className="flex-1" disabled={isDisabled} onClick={() => onAnswer("NOK")}>
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        Nie wiedziałem
      </Button>
      <Button
        variant="default"
        size="lg"
        className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800"
        disabled={isDisabled}
        onClick={() => onAnswer("OK")}
      >
        <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        Wiedziałem
      </Button>
    </div>
  );
}
