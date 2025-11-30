import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

// ============================================================================
// Types
// ============================================================================

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  requireConfirmation?: {
    text: string;
    label: string;
    placeholder?: string;
  };
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Reużywalny dialog potwierdzenia operacji destrukcyjnych
 * 
 * @example Prosty dialog
 * <ConfirmDialog
 *   open={isOpen}
 *   title="Usuń fiszkę"
 *   description="Czy na pewno chcesz usunąć tę fiszkę? Tej operacji nie można cofnąć."
 *   variant="destructive"
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleDelete}
 * />
 * 
 * @example Dialog z weryfikacją tekstową
 * <ConfirmDialog
 *   open={isOpen}
 *   title="Zresetuj postęp"
 *   description="Ta operacja usunie historię wszystkich powtórek."
 *   variant="destructive"
 *   requireConfirmation={{
 *     text: "reset",
 *     label: 'Wpisz "reset" aby potwierdzić',
 *     placeholder: "reset"
 *   }}
 *   onOpenChange={setIsOpen}
 *   onConfirm={handleReset}
 * />
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Potwierdź",
  cancelText = "Anuluj",
  variant = "destructive",
  isLoading = false,
  requireConfirmation,
  onOpenChange,
  onConfirm,
}: ConfirmDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");

  // Reset confirmation text when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setConfirmationText("");
    }
  }, [open]);

  const isConfirmationValid = requireConfirmation
    ? confirmationText.trim().toLowerCase() === requireConfirmation.text.toLowerCase()
    : true;

  const canConfirm = isConfirmationValid && !isLoading;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm();
  };

  const handleCancel = () => {
    if (!isLoading) {
      onOpenChange(false);
    }
  };

  // Prevent closing during loading
  const handleOpenChange = (newOpen: boolean) => {
    if (!isLoading) {
      onOpenChange(newOpen);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireConfirmation && (
          <div className="space-y-2 py-4">
            <Label htmlFor="confirmation-text">
              {requireConfirmation.label}
            </Label>
            <Input
              id="confirmation-text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={requireConfirmation.placeholder || requireConfirmation.text}
              disabled={isLoading}
              autoFocus
            />
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            autoFocus={!requireConfirmation}
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant}
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isLoading ? "Przetwarzanie..." : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

