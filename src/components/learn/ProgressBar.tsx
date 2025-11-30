// ============================================================================
// Types
// ============================================================================

interface ProgressBarProps {
  current: number;
  total: number;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Progress bar component
 * Visualizes progress through the current learning session
 */
export function ProgressBar({ current, total }: ProgressBarProps) {
  // Prevent division by zero
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  // Clamp to 0-100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Postęp sesji</span>
        <span>{current} / {total}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${clampedPercentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label={`Ukończono ${current} z ${total} kart`}
        />
      </div>
    </div>
  );
}

