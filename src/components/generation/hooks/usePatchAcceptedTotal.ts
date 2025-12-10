import { useState } from "react";
import type { UpdateGenerationAcceptedCommand, ApiErrorResponse } from "../../../types";

// ============================================================================
// Types
// ============================================================================

interface UsePatchAcceptedTotalReturn {
  patchAcceptedTotal: (sessionId: number, acceptedTotal: number) => Promise<boolean>;
  isPatching: boolean;
  error: { message: string; code?: string } | null;
}

// ============================================================================
// Hook
// ============================================================================

export function usePatchAcceptedTotal(): UsePatchAcceptedTotalReturn {
  const [isPatching, setIsPatching] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const patchAcceptedTotal = async (sessionId: number, acceptedTotal: number): Promise<boolean> => {
    setIsPatching(true);
    setError(null);

    try {
      const command: UpdateGenerationAcceptedCommand = {
        accepted_total: acceptedTotal,
      };

      const response = await fetch(`/api/generations/${sessionId}/accepted`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        setError(errorData.error);
        return false;
      }

      return true;
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Network error occurred",
        code: "NETWORK_ERROR",
      });
      return false;
    } finally {
      setIsPatching(false);
    }
  };

  return {
    patchAcceptedTotal,
    isPatching,
    error,
  };
}
