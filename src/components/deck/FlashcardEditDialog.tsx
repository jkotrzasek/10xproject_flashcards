import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import type { DeckFlashcardVM } from "../DeckDetailsPage";

// ============================================================================
// Types
// ============================================================================

interface FlashcardEditDialogProps {
  open: boolean;
  flashcard?: DeckFlashcardVM;
  isSaving: boolean;
  error?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: { front: string; back: string }) => Promise<void>;
}

interface FormValues {
  front: string;
  back: string;
}

interface FormErrors {
  front?: string;
  back?: string;
}

// ============================================================================
// Validation
// ============================================================================

function validateForm(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  const trimmedFront = values.front.trim();
  const trimmedBack = values.back.trim();

  if (!trimmedFront) {
    errors.front = "Przód fiszki jest wymagany";
  } else if (trimmedFront.length > 200) {
    errors.front = "Przód fiszki nie może być dłuższy niż 200 znaków";
  }

  if (!trimmedBack) {
    errors.back = "Tył fiszki jest wymagany";
  } else if (trimmedBack.length > 500) {
    errors.back = "Tył fiszki nie może być dłuższy niż 500 znaków";
  }

  return errors;
}

// ============================================================================
// Component
// ============================================================================

export function FlashcardEditDialog({
  open,
  flashcard,
  isSaving,
  error,
  onOpenChange,
  onSubmit,
}: FlashcardEditDialogProps) {
  const [values, setValues] = useState<FormValues>({
    front: "",
    back: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ front: boolean; back: boolean }>({
    front: false,
    back: false,
  });

  // Reset form when dialog opens with new flashcard
  useEffect(() => {
    if (open && flashcard) {
      setValues({
        front: flashcard.front,
        back: flashcard.back,
      });
      setErrors({});
      setTouched({ front: false, back: false });
    }
  }, [open, flashcard]);

  const hasChanges =
    flashcard && (values.front.trim() !== flashcard.front.trim() || values.back.trim() !== flashcard.back.trim());

  const formErrors = validateForm(values);
  const hasErrors = Object.keys(formErrors).length > 0;
  const canSubmit = hasChanges && !hasErrors && !isSaving;

  const handleFrontChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValues({ ...values, front: e.target.value });
    if (touched.front) {
      const newErrors = validateForm({ ...values, front: e.target.value });
      setErrors(newErrors);
    }
  };

  const handleBackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValues({ ...values, back: e.target.value });
    if (touched.back) {
      const newErrors = validateForm({ ...values, back: e.target.value });
      setErrors(newErrors);
    }
  };

  const handleFrontBlur = () => {
    setTouched({ ...touched, front: true });
    const newErrors = validateForm(values);
    setErrors(newErrors);
  };

  const handleBackBlur = () => {
    setTouched({ ...touched, back: true });
    const newErrors = validateForm(values);
    setErrors(newErrors);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({ front: true, back: true });

    // Validate
    const newErrors = validateForm(values);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    if (!hasChanges) {
      return;
    }

    await onSubmit({
      front: values.front.trim(),
      back: values.back.trim(),
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edytuj fiszkę</DialogTitle>
          <DialogDescription>
            Zmień treść przodu lub tyłu fiszki. Zmiany będą widoczne w decku oraz trybie nauki.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Global error from API */}
            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
                {error}
              </div>
            )}

            {/* Front field */}
            <div className="space-y-2">
              <Label htmlFor="front">
                Przód <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="front"
                value={values.front}
                onChange={handleFrontChange}
                onBlur={handleFrontBlur}
                disabled={isSaving}
                className={errors.front && touched.front ? "border-destructive" : ""}
                rows={3}
              />
              <div className="flex justify-between text-xs">
                <div>{errors.front && touched.front && <span className="text-destructive">{errors.front}</span>}</div>
                <span className={values.front.length > 200 ? "text-destructive" : "text-muted-foreground"}>
                  {values.front.length}/200
                </span>
              </div>
            </div>

            {/* Back field */}
            <div className="space-y-2">
              <Label htmlFor="back">
                Tył <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="back"
                value={values.back}
                onChange={handleBackChange}
                onBlur={handleBackBlur}
                disabled={isSaving}
                className={errors.back && touched.back ? "border-destructive" : ""}
                rows={4}
              />
              <div className="flex justify-between text-xs">
                <div>{errors.back && touched.back && <span className="text-destructive">{errors.back}</span>}</div>
                <span className={values.back.length > 500 ? "text-destructive" : "text-muted-foreground"}>
                  {values.back.length}/500
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
              Anuluj
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSaving ? "Zapisywanie..." : "Zapisz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
