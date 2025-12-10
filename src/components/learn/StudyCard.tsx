import { useState, useEffect } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import type { LearnFlashcardViewModel } from "./typesLearn";

// ============================================================================
// Types
// ============================================================================

interface StudyCardProps {
  card: LearnFlashcardViewModel | null;
  isBackVisible: boolean;
  isTransitioning: boolean;
  onReveal: () => void;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Study card component with flip animation
 * Displays the front, then flips to show only the back, with option to show both
 * Slides out when answered, new card slides in
 */
export function StudyCard({ card, isBackVisible, isTransitioning, onReveal }: StudyCardProps) {
  const [isFlipping, setIsFlipping] = useState(false);
  const [showFullView, setShowFullView] = useState(false);

  // Reset full view when card changes or back is hidden
  useEffect(() => {
    if (!isBackVisible) {
      setShowFullView(false);
    }
  }, [isBackVisible, card?.id]);

  if (!card) {
    return (
      <Card className="min-h-[300px] flex items-center justify-center">
        <CardContent className="text-center text-muted-foreground">Ładowanie karty...</CardContent>
      </Card>
    );
  }

  const handleReveal = () => {
    if (isFlipping) return;

    setIsFlipping(true);

    // Trigger state change after half the animation (when card is perpendicular)
    setTimeout(() => {
      onReveal();
    }, 300);

    // Reset flipping state after animation completes
    setTimeout(() => {
      setIsFlipping(false);
    }, 600);
  };

  const handleShowFull = () => {
    setShowFullView(true);
  };

  return (
    <div className="relative min-h-[300px] overflow-hidden" style={{ perspective: "1500px" }}>
      <div
        className="relative w-full min-h-[300px] transition-all duration-400 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: isTransitioning ? "translateX(-120%) rotateY(180deg)" : "translateX(0) rotateY(0deg)",
          opacity: isTransitioning ? 0 : 1,
        }}
      >
        <Card
          className={`min-h-[300px] flex flex-col transition-all duration-600 ease-in-out ${
            isFlipping ? "card-flipping" : ""
          } ${isBackVisible && !isFlipping ? "card-flipped" : ""} ${
            !isBackVisible && !isFlipping ? "cursor-pointer hover:shadow-lg" : ""
          }`}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipping || isBackVisible ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
          onClick={!isBackVisible && !isFlipping ? handleReveal : undefined}
        >
          <CardContent className="flex-1 flex flex-col justify-between">
            {/* Show only front (before reveal) */}
            {!isBackVisible && !isFlipping && !isTransitioning && (
              <>
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Przód:</div>
                  <div className="text-lg whitespace-pre-wrap break-words" style={{ whiteSpace: "pre-wrap" }}>
                    {card.front}
                  </div>
                </div>

                <div className="mt-6 text-center text-sm text-muted-foreground">Naciśnij na fiszkę aby odsłonić 👆</div>
              </>
            )}

            {/* Show during flip animation */}
            {isFlipping && (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Show only back (after flip, before "show full") */}
            {isBackVisible && !showFullView && !isFlipping && (
              <>
                <div className="space-y-4" style={{ transform: "rotateY(180deg)" }}>
                  <div className="text-sm font-medium text-muted-foreground">Tył:</div>
                  <div className="text-lg whitespace-pre-wrap break-words" style={{ whiteSpace: "pre-wrap" }}>
                    {card.back}
                  </div>
                </div>

                <div className="mt-6 flex justify-center" style={{ transform: "rotateY(180deg)" }}>
                  <Button onClick={handleShowFull} size="sm" variant="ghost">
                    Pokaż całość
                  </Button>
                </div>
              </>
            )}

            {/* Show both sides (after "show full") */}
            {isBackVisible && showFullView && !isFlipping && (
              <div style={{ transform: "rotateY(180deg)" }}>
                <div className="space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Przód:</div>
                  <div className="text-lg whitespace-pre-wrap break-words" style={{ whiteSpace: "pre-wrap" }}>
                    {card.front}
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t space-y-4">
                  <div className="text-sm font-medium text-muted-foreground">Tył:</div>
                  <div className="text-lg whitespace-pre-wrap break-words" style={{ whiteSpace: "pre-wrap" }}>
                    {card.back}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <style>{`
        .card-flipping {
          transition: transform 0.6s ease-in-out !important;
        }

        .card-flipped {
          transition: transform 0s !important;
        }
      `}</style>
    </div>
  );
}
