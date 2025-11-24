import { Badge } from "../ui/badge";
import type { GenerationLimitDto } from "../../types";

// ============================================================================
// Types
// ============================================================================

interface LimitBadgeProps {
  limit: GenerationLimitDto;
}

// ============================================================================
// Component
// ============================================================================

export function LimitBadge({ limit }: LimitBadgeProps) {
  const { remaining, daily_limit } = limit;
  const isExhausted = remaining <= 0;

  return (
    <Badge variant={isExhausted ? "destructive" : "secondary"} className="text-sm">
      {isExhausted ? (
        <><strong>Limit wyczerpany</strong> 0/{daily_limit}</>
      ) : (
        <>
          Pozostało: {remaining}/{daily_limit}
        </>
      )}
    </Badge>
  );
}

