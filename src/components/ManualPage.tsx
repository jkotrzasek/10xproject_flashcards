import { useEffect, useState } from "react";
import { ManualFlashcardView } from "./manual/ManualFlashcardView";

// ============================================================================
// Helper to read query param
// ============================================================================

function getDeckIdFromQuery(): number | null {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const deckIdParam = params.get("deckId");

  if (!deckIdParam) return null;

  const parsed = parseInt(deckIdParam, 10);
  return !isNaN(parsed) ? parsed : null;
}

// ============================================================================
// Component
// ============================================================================

export default function ManualPage() {
  const [initialDeckId, setInitialDeckId] = useState<number | null>(null);

  useEffect(() => {
    setInitialDeckId(getDeckIdFromQuery());
  }, []);

  return <ManualFlashcardView initialDeckId={initialDeckId} />;
}

