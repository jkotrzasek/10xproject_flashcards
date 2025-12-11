# Plan testów jednostkowych - formatowanie dat

## Problem: Duplikacja kodu

#### `formatDate` - występuje w **5 miejscach**:
1. `src/lib/format-date.ts` - eksportowana wersja
2. `src/components/dashboard/hooks/useDecksData.ts` - jako `formatUpdatedLabel`
3. `src/components/deck/hooks/useDeckDetails.ts` - lokalna kopia
4. `src/components/deck/hooks/useDeckFlashcards.ts` - lokalna kopia
5. `src/components/unassigned/hooks/useUnassignedFlashcards.ts` - lokalna kopia

#### `formatLastRepetitionLabel` - występuje w **2 miejscach** (RÓŻNE implementacje!):
1. `src/components/deck/hooks/useDeckFlashcards.ts` - przyjmuje `(lastRepetition, spaceRepetition)`, zwraca `null` gdy brak
2. `src/components/unassigned/hooks/useUnassignedFlashcards.ts` - przyjmuje tylko `(lastRepetition)`, zwraca `"Brak powtórek"` gdy brak

#### `getSourceLabel` - występuje w **2 miejscach** (identyczne):
1. `src/components/deck/hooks/useDeckFlashcards.ts`
2. `src/components/unassigned/hooks/useUnassignedFlashcards.ts`

#### `getSpaceRepetitionLabel` - występuje w **2 miejscach** (identyczne):
1. `src/components/deck/hooks/useDeckFlashcards.ts`
2. `src/components/unassigned/hooks/useUnassignedFlashcards.ts`

---

## tests/unit/lib/format-date.test.ts

**Cel:** Kompleksowe przetestowanie logiki formatowania dat

**Testowana funkcja:** `formatDate(dateString: string): string`

### 1. Względne formatowanie - Przedziały czasowe

**Grupa:** "Przed chwilą" (< 1 minuta)
- ✅ `0 sekund temu → "Przed chwilą"`
- ✅ `30 sekund temu → "Przed chwilą"`
- ✅ `59 sekund temu → "Przed chwilą"`
- ✅ `59.9 sekund temu → "Przed chwilą"` (test zaokrąglenia w dół)

**Grupa:** "X min temu" (1-59 minut)
- ✅ `1 minuta temu → "1 min temu"`
- ✅ `30 minut temu → "30 min temu"`
- ✅ `59 minut temu → "59 min temu"`
- ✅ `60 minut temu → "1h temu"` (boundary test - przejście do godzin)

**Grupa:** "Xh temu" (1-23 godziny)
- ✅ `1 godzina temu → "1h temu"`
- ✅ `12 godzin temu → "12h temu"`
- ✅ `23 godziny temu → "23h temu"`
- ✅ `24 godziny temu → "1 dni temu"` (boundary test - przejście do dni)

**Grupa:** "X dni temu" (1-6 dni)
- ✅ `1 dzień temu → "1 dni temu"`
- ✅ `3 dni temu → "3 dni temu"`
- ✅ `6 dni temu → "6 dni temu"`
- ✅ `7 dni temu → pełna data` (boundary test - przejście do pełnej daty)

**Podsumowanie grupy:** 16 testów

---

### 2. Pełne formatowanie daty

**Grupa:** Data w bieżącym roku (bez roku w output)
- ✅ `7 dni temu w bieżącym roku → "4 gru"`
- ✅ `30 dni temu w bieżącym roku → "11 lis"`
- ✅ `1 stycznia bieżącego roku → "1 sty"`
- ✅ `31 grudnia bieżącego roku → "31 gru"`

**Grupa:** Data z poprzednich lat (z rokiem)
- ✅ `Data z poprzedniego roku → "11 gru 2024"`
- ✅ `Data sprzed 2 lat → "1 sty 2023"`
- ✅ `Data sprzed 5 lat → "15 mar 2020"`

**Grupa:** Weryfikacja polskich skrótów miesięcy (pl-PL)
- ✅ `Test dla każdego miesiąca (styczeń → "sty", luty → "lut", etc.)`
  - Można to zrobić jako jeden test parametryzowany z 12 przypadkami
  - Lub 12 osobnych testów dla czytelności

**Podsumowanie grupy:** 7 testów + 1 parametryzowany (12 przypadków) = ~19 testów

---

### 3. Edge cases

**Grupa:** Granice przedziałów czasowych
- ✅ `59.99 sekund → "Przed chwilą"` (zaokrąglenie w dół)
- ✅ `59.99 minut → "59 min temu"` (zaokrąglenie w dół)
- ✅ `23.99 godzin → "23h temu"` (zaokrąglenie w dół)
- ✅ `6.99 dni → "6 dni temu"` (zaokrąglenie w dół)

**Grupa:** Daty specjalne
- ✅ `Unix epoch (1970-01-01) → pełna data z rokiem`
- ✅ `Data bardzo stara (100 lat temu) → pełna data z rokiem`
- ✅ `Data z przełomu roku (31 grudnia → 1 stycznia)`

**Grupa:** Nieprawidłowe dane wejściowe
- ✅ `Nieprawidłowy string daty → obsługa błędu (Invalid Date lub throw)`
- ✅ `Pusty string → obsługa błędu`
- ⚠️ `null/undefined → obsługa błędu` (jeśli TypeScript nie blokuje w runtime)

**Podsumowanie grupy:** ~11 testów

---

### 4. Time-dependent tests (mockowanie czasu)

**Grupa:** Zależność od "teraz"
- ✅ `Ta sama data ISO formatuje się różnie w zależności od "teraz"`
  - Mock: teraz = 2025-12-11 10:00
  - Input: 2025-12-11 09:30 → "30 min temu"
  - Zmień mock: teraz = 2025-12-12 10:00
  - Ten sam input: 2025-12-11 09:30 → "1 dni temu"

- ✅ `Przejście przez granicę roku`
  - Mock: teraz = 2025-01-05
  - Input: 2024-12-15 → "15 gru 2024" (z rokiem)
  - Zmień mock: teraz = 2024-12-20
  - Ten sam input: 2024-12-15 → "15 gru" (bez roku)

**Podsumowanie grupy:** 2-3 testy z wieloma assertami

---

### **RAZEM: ~52 testy**

---

## Notatki implementacyjne

### Mockowanie czasu w Vitest

```typescript
import { vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2025-12-11T10:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});
```

### Test parametryzowany w Vitest

```typescript
describe.each([
  { secondsAgo: 30, expected: "Przed chwilą" },
  { secondsAgo: 60 * 15, expected: "15 min temu" },
  { secondsAgo: 3600 * 5, expected: "5h temu" },
  { secondsAgo: 86400 * 2, expected: "2 dni temu" },
])('formatDate($secondsAgo seconds ago) -> $expected', ({ secondsAgo, expected }) => {
  const date = new Date(Date.now() - secondsAgo * 1000).toISOString();
  expect(formatDate(date)).toBe(expected);
});
```

### Testowanie polskich miesięcy

```typescript
const polishMonths = [
  { month: 0, short: 'sty' },
  { month: 1, short: 'lut' },
  { month: 2, short: 'mar' },
  { month: 3, short: 'kwi' },
  { month: 4, short: 'maj' },
  { month: 5, short: 'cze' },
  { month: 6, short: 'lip' },
  { month: 7, short: 'sie' },
  { month: 8, short: 'wrz' },
  { month: 9, short: 'paź' },
  { month: 10, short: 'lis' },
  { month: 11, short: 'gru' },
];

describe.each(polishMonths)(
  'formats month $month correctly as "$short"',
  ({ month, short }) => {
    // Data sprzed roku żeby wymusić pełne formatowanie
    const date = new Date(2024, month, 15).toISOString();
    const result = formatDate(date);
    expect(result).toContain(short);
  }
);
```
