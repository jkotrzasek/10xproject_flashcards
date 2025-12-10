import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthErrorBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function AuthErrorBanner({ message, onDismiss, className }: AuthErrorBannerProps) {
  return (
    <div
      className={cn("flex items-start gap-3 rounded-md bg-destructive/10 border border-destructive/20 p-4", className)}
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-foreground">{message}</div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Zamknij komunikat"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
