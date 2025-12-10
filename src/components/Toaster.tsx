import { Toaster as SonnerToaster } from "sonner";

// ============================================================================
// Component
// ============================================================================

export function Toaster() {
  return <SonnerToaster position="top-right" expand={false} richColors closeButton duration={4000} />;
}
