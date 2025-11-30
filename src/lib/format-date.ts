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
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined 
  });
}

