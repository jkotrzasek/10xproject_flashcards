import type { FlashcardSource, SpaceRepetitionStatus } from "../types";

/**
 * Formatuje datę ISO na względny format (np. "2 min temu", "3 dni temu")
 * lub na pełną datę dla starszych dat
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Przed chwilą";
  if (diffMins < 60) return `${diffMins} min temu`;
  if (diffHours < 24) return `${diffHours}h temu`;
  if (diffDays < 7) return `${diffDays} dni temu`;

  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

/**
 * Formatuje datę ostatniej powtórki.
 * @param lastRepetition - data ostatniej powtórki lub null
 * @param fallbackText - tekst zwracany gdy brak daty (domyślnie null)
 */
export function formatLastRepetitionLabel(
  lastRepetition: string | null,
  fallbackText: string | null = null
): string | null {
  if (!lastRepetition) return fallbackText;

  const date = new Date(lastRepetition);
  return `Ostatnia: ${date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })}`;
}

/**
 * Zwraca czytelną etykietę dla źródła fiszki
 */
export function getSourceLabel(source: FlashcardSource): string {
  switch (source) {
    case "ai_full":
      return "AI";
    case "ai_edited":
      return "AI (edytowana)";
    case "manual":
      return "Manual";
    default:
      return "Nieznane";
  }
}

/**
 * Zwraca czytelną etykietę dla statusu powtórek
 */
export function getSpaceRepetitionLabel(status: SpaceRepetitionStatus): string {
  switch (status) {
    case "OK":
      return "OK";
    case "NOK":
      return "Do powtórki";
    case "not_checked":
      return "Nie oceniana";
    default:
      return "Nieznany status";
  }
}
