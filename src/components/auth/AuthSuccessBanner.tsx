import { CheckCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthSuccessBannerProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function AuthSuccessBanner({ message, onDismiss, className }: AuthSuccessBannerProps) {
  return (
    <div 
      className={cn(
        "flex items-start gap-3 rounded-md bg-green-500/10 border border-green-500/20 p-4",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-500 shrink-0 mt-0.5" />
      <div className="flex-1 text-sm text-foreground">
        {message}
      </div>
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

