import { type ChangeEvent, type FocusEvent, useRef, useEffect } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import type { FlashcardProposalVM } from "./generationTypes";

// ============================================================================
// Constants
// ============================================================================

const MAX_FRONT_LENGTH = 200;
const MAX_BACK_LENGTH = 500;

// ============================================================================
// Types
// ============================================================================

interface AIProposalProps {
  item: FlashcardProposalVM;
  onChange: (changes: Partial<FlashcardProposalVM>) => void;
}

// ============================================================================
// Component
// ============================================================================

export function AIProposal({ item, onChange }: AIProposalProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [item.back]);

  const handleFrontChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onChange({
      front: value,
      isEdited: value !== item.originalFront || item.back !== item.originalBack,
    });
  };

  const handleBackChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    onChange({
      back: value,
      isEdited: item.front !== item.originalFront || value !== item.originalBack,
    });
  };

  const handleFrontBlur = (e: FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const length = value.length;

    if (length === 0) {
      onChange({
        errors: {
          ...item.errors,
          front: "Przód fiszki nie może być pusty",
        },
      });
    } else if (length > MAX_FRONT_LENGTH) {
      onChange({
        errors: {
          ...item.errors,
          front: `Maksymalna długość: ${MAX_FRONT_LENGTH} znaków`,
        },
      });
    } else {
      // Clear front error
      const newErrors = { ...item.errors };
      delete newErrors.front;
      onChange({
        errors: Object.keys(newErrors).length > 0 ? newErrors : undefined,
      });
    }
  };

  const handleBackBlur = (e: FocusEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const length = value.length;

    if (length === 0) {
      onChange({
        errors: {
          ...item.errors,
          back: "Tył fiszki nie może być pusty",
        },
      });
    } else if (length > MAX_BACK_LENGTH) {
      onChange({
        errors: {
          ...item.errors,
          back: `Maksymalna długość: ${MAX_BACK_LENGTH} znaków`,
        },
      });
    } else {
      // Clear back error
      const newErrors = { ...item.errors };
      delete newErrors.back;
      onChange({
        errors: Object.keys(newErrors).length > 0 ? newErrors : undefined,
      });
    }
  };

  const handleAcceptedToggle = (checked: boolean) => {
    onChange({ accepted: checked });
  };

  return (
    <Card className={item.accepted ? "border-primary/50" : "opacity-60"}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id={`accept-${item.id}`}
              checked={item.accepted}
              onCheckedChange={handleAcceptedToggle}
              aria-label={`Akceptuj fiszkę ${item.index + 1}`}
            />
            <Label htmlFor={`accept-${item.id}`} className="cursor-pointer text-xs font-medium">
              Akceptuj
            </Label>
          </div>
          <Badge variant={item.isEdited ? "default" : "secondary"} className="text-xs">
            {item.isEdited ? "Edytowane" : "AI"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Front field */}
        <div className="space-y-1">
          <Label htmlFor={`front-${item.id}`} className="text-xs font-medium">
            Przód
          </Label>
          <Input
            id={`front-${item.id}`}
            value={item.front}
            onChange={handleFrontChange}
            onBlur={handleFrontBlur}
            placeholder="Przód fiszki..."
            maxLength={MAX_FRONT_LENGTH}
            className="text-sm min-h-[20px] max-h-[40px] resize-none overflow-hidden"
            aria-describedby={item.errors?.front ? `front-error-${item.id}` : undefined}
            aria-invalid={!!item.errors?.front}
          />
          {item.errors?.front && (
            <p
              id={`front-error-${item.id}`}
              className="text-xs text-destructive"
              role="alert"
            >
              {item.errors.front}
            </p>
          )}
        </div>

        {/* Back field */}
        <div className="space-y-1">
          <Label htmlFor={`back-${item.id}`} className="text-xs font-medium">
            Tył
          </Label>
          <Textarea
            ref={textareaRef}
            id={`back-${item.id}`}
            value={item.back}
            onChange={handleBackChange}
            onBlur={handleBackBlur}
            placeholder="Tył fiszki..."
            maxLength={MAX_BACK_LENGTH}
            className="min-h-[60px] max-h-[120px] resize-none overflow-hidden text-sm"
            aria-describedby={item.errors?.back ? `back-error-${item.id}` : undefined}
            aria-invalid={!!item.errors?.back}
          />
          {item.errors?.back && (
            <p
              id={`back-error-${item.id}`}
              className="text-xs text-destructive"
              role="alert"
            >
              {item.errors.back}
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 text-xs text-muted-foreground">
        #{item.index + 1} • {item.front.length}/{MAX_FRONT_LENGTH} • {item.back.length}/{MAX_BACK_LENGTH}
      </CardFooter>
    </Card>
  );
}

