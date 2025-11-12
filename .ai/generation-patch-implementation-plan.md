# API Endpoint Implementation Plan: PATCH /api/generations/:sessionId/accepted

## 1. Przegląd punktu końcowego

Punkt końcowy umożliwia użytkownikowi aktualizację pola `accepted_total` w rekordzie generacji, aby odzwierciedlić liczbę zaakceptowanych propozycji fiszek, z zachowaniem ograniczeń biznesowych i bazy danych.

## 2. Szczegóły żądania

Metoda HTTP: PATCH.  
Struktura URL: `/api/generations/:sessionId/accepted`.  
Parametry wymagane: identyfikator sesji w ścieżce oraz `accepted_total` w korpusie JSON.  
Parametry opcjonalne: brak.  
Treść żądania:

```json
{ "accepted_total": 8 }
```

Walidacja wstępna obejmie wymuszenie dodatniego `sessionId` poprzez istniejący schemat Zod i sprawdzenie, że `accepted_total` jest liczbą całkowitą większą lub równą zero.

## 3. Wykorzystywane typy

Na potrzeby żądania używamy istniejącego modelu poleceń `UpdateGenerationAcceptedCommand`, który reprezentuje korpus aktualizacji:

```195:198:src/types.ts
export type UpdateGenerationAcceptedCommand = Pick<GenerationInsert, "accepted_total">;
```

Identyfikator sesji pozostaje pod kontrolą schematu:

```25:29:src/lib/validation/generation.schema.ts
export const generationSessionIdSchema = z.coerce
  .number()
  .int("Session ID must be an integer")
  .positive("Session ID must be a positive number")
  .safe("Session ID is out of safe integer range");
```

Plan obejmuje dodanie nowego schematu `updateGenerationAcceptedSchema` w tym samym module, aby zmapować `UpdateGenerationAcceptedCommand`. Po stronie odpowiedzi stosujemy `ApiErrorResponse` w przypadku błędów, a odpowiedź sukcesu nie zwraca danych.

## 4. Szczegóły odpowiedzi

Sukces zwraca status 200 z pustym korpusem, co możemy zrealizować poprzez `return new Response(null, { status: 200 });`. Błędy walidacji wejścia zwracają 400, brak autoryzacji 401, brak rekordu 404, a problemy z bazą danych lub inne wyjątki 500, z treścią zgodną ze strukturą `ApiErrorResponse`.

## 5. Przepływ danych

Handler Astro odbiera żądanie, pobiera uwierzytelnionego klienta Supabase z `locals` i waliduje `sessionId` zgodnie z przytoczonym schematem. Następnie próbuje sparsować korpus JSON; w razie błędu natychmiast zwraca 400. Po przejściu walidacji schematu `updateGenerationAcceptedSchema` wywołuje nową funkcję serwisową, która pobiera rekord generacji filtrowany dodatkowo po `user_id`, aby zapobiec aktualizacji cudzych danych. Serwis sprawdza, czy rekord istnieje oraz czy nowa wartość `accepted_total` nie przekracza bieżącego `generated_total`, korzystając z constraintu `accepted_total <= generated_total` opisanego w specyfikacji tabeli generations. Po pozytywnej weryfikacji serwis aktualizuje `accepted_total` i `updated_at` w jednej operacji, po czym handler odsyła status 200 bez treści. Wystąpienie błędu w serwisie skutkuje rzuceniem wyjątku, a handler mapuje go na odpowiedni kod HTTP.

## 6. Względy bezpieczeństwa

Autentykacja w MVP nadal korzysta ze stałego identyfikatora użytkownika:

```18:22:src/pages/api/generations/index.ts
const USER_ID = DEFAULT_USER_ID;
```

Plan zakłada utrzymanie tego rozwiązania do czasu wdrożenia realnego uwierzytelniania, lecz zaznacza konieczność zwrócenia 401 w przypadku braku `locals.supabase` lub użytkownika. Każde zapytanie Supabase musi mieć filtr `eq("user_id", USER_ID)`, aby uniknąć naruszeń dostępu. Dodatkowo walidacja wejścia zapobiega wstrzyknięciu danych i utrzymuje integralność constraintów.

## 7. Obsługa błędów

Nieprawidłowy JSON skutkuje 400 z kodem `INVALID_JSON`. Naruszenie schematu (np. ujemny `accepted_total`) zwraca 400 i kod `INVALID_INPUT`. Próba ustawienia wartości większej niż `generated_total` albo mniejszej od zera powinna również kończyć się 400 z kodem `EXCEEDS_GENERATED_TOTAL` lub `NEGATIVE_ACCEPTED_TOTAL`. Brak autoryzacji prowadzi do 401 z kodem `UNAUTHORIZED`. Nieistniejąca sesja dla użytkownika zwraca 404 z kodem `NOT_FOUND`. Błędy Supabase lub nieoczekiwane wyjątki kończą się 500 z kodem `INTERNAL_ERROR`, po uprzednim zapisaniu szczegółów przez `console.error`, zgodnie z istniejącym wzorcem w serwisie:

```145:156:src/lib/services/generation.service.ts
  if (error) {
    console.error("Error finalizing generation success:", error);
    throw new Error("Failed to update generation status");
  }
```

## 8. Rozważania dotyczące wydajności

Operacja dotyczy pojedynczego rekordu i wykonuje pojedyncze zapytanie, więc narzut jest minimalny. Warto zadbać o idempotentność: wielokrotne wysłanie tej samej wartości powinno kończyć się sukcesem bez dodatkowych obciążeń. Można rozważyć opcjonalne dodanie warunku aktualizacji `accepted_total` tylko przy zmianie wartości, co ograniczy niepotrzebne zapisy.

## 9. Etapy wdrożenia

Krok 1. Rozszerz `src/lib/validation/generation.schema.ts` o schemat `updateGenerationAcceptedSchema` i eksport typu pomocniczego.  
Krok 2. Dodaj w `src/lib/services/generation.service.ts` funkcję `updateGenerationAcceptedTotal`, która pobiera rekord, weryfikuje granice i aktualizuje `accepted_total` oraz `updated_at` dla zalogowanego użytkownika.  
Krok 3. Utwórz plik `src/pages/api/generations/[sessionId]/accepted.ts`, importuj nowe schematy i funkcję serwisową, implementuj logikę obsługi błędów zgodnie z sekcjami 5–7 oraz użyj `prerender = false`.
