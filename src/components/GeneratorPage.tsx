import { useState } from "react";
import { toast } from "sonner";
import { useGenerationLimits } from "./generation/hooks/useGenerationLimits";
import { useGenerate } from "./generation/hooks/useGenerate";
import { useDecks } from "./generation/hooks/useDecks";
import { useSaveFlashcards } from "./generation/hooks/useSaveFlashcards";
import { usePatchAcceptedTotal } from "./generation/hooks/usePatchAcceptedTotal";
import { LimitBadge } from "./generation/LimitBadge";
import { AIInputForm } from "./generation/AIInputForm";
import { SkeletonList } from "./SkeletonList";
import { AIProposalList } from "./generation/AIProposalList";
import { Toaster } from "./Toaster";
import type { FlashcardProposalVM } from "./generation/generationTypes";

// ============================================================================
// Component
// ============================================================================

export default function GeneratorPage() {
  const { limits, isLoading: isLoadingLimits, error: limitsError, refetch: refetchLimits } = useGenerationLimits();
  const { generate, isGenerating, error: generateError } = useGenerate();
  const { decks, isLoading: isLoadingDecks, refetch: refetchDecks } = useDecks();
  const { saveFlashcards, isSaving } = useSaveFlashcards();
  const { patchAcceptedTotal } = usePatchAcceptedTotal();
  
  const [proposals, setProposals] = useState<FlashcardProposalVM[]>([]);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [selectedDeckId, setSelectedDeckId] = useState<number | null | undefined>(undefined);
  const [generationError, setGenerationError] = useState<string | undefined>();
  const [shouldClearForm, setShouldClearForm] = useState(false);
  const [isRefreshingLimits, setIsRefreshingLimits] = useState(false);
  const [isSavingLocal, setIsSavingLocal] = useState(false); // Local saving state to prevent race condition

  const hasProposals = proposals.length > 0;

  const handleGenerate = async (inputText: string) => {
    setGenerationError(undefined);
    setShouldClearForm(false);

    const result = await generate(inputText);

    if (result) {
      // Success: set proposals and session
      setProposals(result.proposals);
      setSessionId(result.sessionId);

      setIsRefreshingLimits(true);
      // Refresh limits
      await refetchLimits();
      setIsRefreshingLimits(false);

      toast.success(`Wygenerowano ${result.proposals.length} propozycji fiszek`);
    } else if (generateError) {
      // Error from hook
      setIsRefreshingLimits(false);
      setGenerationError(generateError.message);
      toast.error(generateError.message);
    }
  };

  const handleProposalChange = (itemId: number, changes: Partial<FlashcardProposalVM>) => {
    setProposals((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, ...changes }
          : item
      )
    );
  };

  const handleSaveAccepted = async () => {
    if (!sessionId || isSavingLocal) {
      return;
    }

    const acceptedProposals = proposals.filter((p) => p.accepted);
    if (acceptedProposals.length === 0) {
      toast.error("Nie zaznaczono żadnej fiszki do zapisu");
      return;
    }

    // Validate all accepted proposals
    const hasErrors = acceptedProposals.some((p) => p.errors?.front || p.errors?.back);
    if (hasErrors) {
      toast.error("Popraw błędy walidacji przed zapisem");
      return;
    }

    setIsSavingLocal(true);

    try {
      const stats = await saveFlashcards(acceptedProposals, sessionId, selectedDeckId);

      if (stats.saved > 0) {
        // Update accepted_total in generation metadata
        await patchAcceptedTotal(sessionId, stats.saved);

        if (stats.failed === 0) {
          // Full success - all saved
          toast.success(`Zapisano ${stats.saved} fiszek`);
          
          // Clear proposals and reset form
          setProposals([]);
          setSessionId(null);
          setSelectedDeckId(undefined);
          setShouldClearForm(true);
          
          // Refresh decks in background if saved to a deck
          if (selectedDeckId) {
            refetchDecks();
          }
        } else {
          // Partial success - remove only successfully saved proposals
          toast.warning(`Zapisano ${stats.saved} z ${stats.attempted} fiszek`);
          
          setProposals((prev) => prev.filter((p) => !stats.savedIds.includes(p.id)));
        }
      } else {
        toast.error("Nie udało się zapisać żadnej fiszki");
      }
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleSaveAll = async () => {
    if (!sessionId || isSavingLocal) {
      return;
    }

    if (proposals.length === 0) {
      toast.error("Brak propozycji do zapisu");
      return;
    }

    // Validate all proposals
    const hasErrors = proposals.some((p) => p.errors?.front || p.errors?.back);
    if (hasErrors) {
      toast.error("Popraw błędy walidacji przed zapisem");
      return;
    }

    setIsSavingLocal(true);

    try {
      // Save all proposals directly (ignore accepted flag)
      const stats = await saveFlashcards(proposals, sessionId, selectedDeckId);

      if (stats.saved > 0) {
        // Update accepted_total in generation metadata
        await patchAcceptedTotal(sessionId, stats.saved);

        if (stats.failed === 0) {
          // Full success
          toast.success(`Zapisano ${stats.saved} fiszek`);
          
          // Clear proposals and reset form
          setProposals([]);
          setSessionId(null);
          setSelectedDeckId(undefined);
          setShouldClearForm(true);
          
          // Refresh decks in background if saved to a deck
          if (selectedDeckId) {
            refetchDecks();
          }
        } else {
          // Partial success - remove only successfully saved proposals
          toast.warning(`Zapisano ${stats.saved} z ${stats.attempted} fiszek`);
          
          setProposals((prev) => prev.filter((p) => !stats.savedIds.includes(p.id)));
        }
      } else {
        toast.error("Nie udało się zapisać żadnej fiszki");
      }
    } finally {
      setIsSavingLocal(false);
    }
  };

  const handleCancel = () => {
    // Clear everything without saving
    setProposals([]);
    setSessionId(null);
    setSelectedDeckId(undefined);
    setShouldClearForm(true);
    toast.info("Anulowano generację");
  };

  if (isLoadingLimits && !isRefreshingLimits) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 w-64 animate-pulse rounded bg-muted"></div>
          <div className="h-4 w-96 animate-pulse rounded bg-muted"></div>
        </div>
      </main>
    );
  }

  if (limitsError && !isRefreshingLimits) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          <h2 className="mb-2 font-semibold">Błąd ładowania limitów</h2>
          <p>{limitsError.message}</p>
        </div>
      </main>
    );
  }

  if (!limits) {
    return (
      <main className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
          <h2 className="mb-2 font-semibold">Nieznany błąd</h2>
          <p>Nie udało się załadować danych. Spróbuj odświeżyć stronę.</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <Toaster />
      <div className="flex flex-col" style={{ height: "calc(100vh - 73px)" }}>
        {/* Fixed Header + Form Section */}
        <div className="shrink-0 border-b border-border bg-background">
        <div className="container mx-auto max-w-7xl px-4 py-6">
          <div className="space-y-6">
            {/* Header */}
            <header className="space-y-3">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Generator AI</h1>
                <LimitBadge limit={limits} />
              </div>
              <p className="text-sm text-muted-foreground">
                Wklej tekst, a AI wygeneruje propozycje fiszek do akceptacji i edycji.
              </p>
            </header>

            {/* Input Form */}
            <AIInputForm
              remaining={limits.remaining}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              error={generationError}
              hasUnsavedProposals={hasProposals}
              shouldClear={shouldClearForm}
              onCleared={() => setShouldClearForm(false)}
            />
          </div>
        </div>
      </div>

        {/* Scrollable Content Area */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-7xl px-4 py-6">
            {/* Generation Loading */}
            {isGenerating && (
              <div className="space-y-4">
                <SkeletonList count={6} />
              </div>
            )}

            {/* Proposals Section */}
            {proposals.length > 0 && !isGenerating && (
            <AIProposalList
              items={proposals}
              onChange={handleProposalChange}
              decks={decks}
              selectedDeckId={selectedDeckId}
              onDeckChange={setSelectedDeckId}
              isLoadingDecks={isLoadingDecks}
              onSaveAccepted={handleSaveAccepted}
              onSaveAll={handleSaveAll}
              onCancel={handleCancel}
              isSaving={isSaving || isSavingLocal}
            />
            )}
          </div>
        </div>
      </div>
    </>
  );
}

