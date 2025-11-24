import { useState, useEffect } from "react";
import type { GenerationLimitDto, ApiResponse, ApiErrorResponse } from "../../../types";

// ============================================================================
// Types
// ============================================================================

interface UseGenerationLimitsReturn {
  limits: GenerationLimitDto | null;
  isLoading: boolean;
  error: { message: string; code?: string } | null;
  refetch: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useGenerationLimits(): UseGenerationLimitsReturn {
  const [limits, setLimits] = useState<GenerationLimitDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);

  const fetchLimits = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/generations/limits");

      if (!response.ok) {
        const errorData: ApiErrorResponse = await response.json();
        setError(errorData.error);
        setLimits(null);
        return;
      }

      const data: ApiResponse<GenerationLimitDto> = await response.json();
      setLimits(data.data);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Network error occurred",
        code: "NETWORK_ERROR",
      });
      setLimits(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
  }, []);

  return {
    limits,
    isLoading,
    error,
    refetch: fetchLimits,
  };
}

