import { Button } from "./ui/button";

// ============================================================================
// Types
// ============================================================================

type EmptyStateVariant = "no-decks" | "no-flashcards";

interface CTAEmptyStateProps {
  variant: EmptyStateVariant;
  onPrimaryAction: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function CTAEmptyState({ variant, onPrimaryAction }: CTAEmptyStateProps) {
  const content = {
    "no-decks": {
      title: "Nie masz jeszcze żadnych decków",
      description: "Stwórz pierwszy deck, aby zacząć organizować swoje fiszki",
      buttonText: "Stwórz pierwszy deck",
    },
    "no-flashcards": {
      title: "Nie masz jeszcze żadnych fiszek",
      description: "Wygeneruj fiszki używając AI lub dodaj je ręcznie",
      buttonText: "Wygeneruj fiszki AI",
    },
  };

  const { title, description, buttonText } = content[variant];

  return (
    <div className="text-center py-12 border rounded-lg bg-muted/20">
      <div className="max-w-md mx-auto">
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-muted-foreground mb-4">{description}</p>
        <Button onClick={onPrimaryAction}>{buttonText}</Button>
      </div>
    </div>
  );
}

