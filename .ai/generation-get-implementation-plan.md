# API Endpoint Implementation Plan: GET `/api/generations/:sessionId` & GET `/api/generations`

## 1. Przegląd punktu końcowego

Punkt końcowy `/api/generations/:sessionId` ma dostarczać metadane pojedynczej sesji generowania (bez propozycji fiszek), filtrując dane do zalogowanego użytkownika. Punkt końcowy `/api/generations` dostarcza listę sesji generowania użytkownika z ostatnich 30 dni, ograniczając pola do identyfikatora, czasu utworzenia, skrótu wejścia oraz liczby wygenerowanych fiszek. Oba punkty końcowe są tylko do odczytu i wymagają autoryzacji Supabase.

## 2. Szczegóły żądania

- Metoda HTTP: `GET`
- Struktura URL:
  - `GET /api/generations/:sessionId`
  - `GET /api/generations`
- Parametry:
  - Wymagane: `sessionId` (segment ścieżki, dodatnia liczba całkowita mieszcząca się w zakresie bigint)
  - Opcjonalne: brak
- Request Body: brak
- Nagłówki: standardowe nagłówki uwierzytelniające Supabase (ciasteczka sesyjne lub Bearer token)

## 3. Wykorzystywane typy

- `GenerationMetadataDto` oraz `GenerationHistoryItemDto` z `src/types.ts` jako docelowe kształty danych biznesowych.
- `ApiResponse<T>` i `ApiErrorResponse` z `src/types.ts` jako opakowania odpowiedzi.
- Nowe schematy Zod (np. `generationSessionIdSchema`) w `src/lib/validation/generation.schema.ts` dla walidacji `sessionId`.
- Brak dodatkowych Command modeli, ponieważ żądania nie posiadają ciała.

## 4. Szczegóły odpowiedzi

- Sukces `200 OK` (pojedyncza sesja):

```json
{
  "data": {
    "session_id": 123,
    "user_id": "hidden",
    "input_text_hash": "8e...ab",
    "input_text_length": 4200,
    "model": "gpt-4o-mini",
    "status": "success",
    "generated_total": 10,
    "accepted_total": 6,
    "created_at": "2025-02-02T10:20:30.000Z",
    "updated_at": "2025-02-02T10:25:30.000Z"
  }
}
```

- Sukces `200 OK` (historia 30 dni):

```json
{
  "data": [
    {
      "session_id": 101,
      "created_at": "2025-02-02T10:20:30.000Z",
      "input_text_hash": "ab...cd",
      "input_text_length": 5600,
      "generated_total": 12
    }
  ]
}
```

- Błędy:
  - `400 Bad Request` dla niepoprawnego `sessionId`.
  - `401 Unauthorized` dla braku sesji Supabase.
  - `404 Not Found` gdy sesja nie należy do użytkownika lub nie istnieje.
  - `500 Internal Server Error` dla awarii bazy lub innych nieoczekiwanych wyjątków.

## 5. Przepływ danych

1. Astro API route (`src/pages/api/generations/[sessionId].ts` oraz `src/pages/api/generations/index.ts` po przeniesieniu z dotychczasowego `src/pages/api/generations.ts`) używa `locals.supabase` do pozyskania uwierzytelnionego klienta i bieżącego użytkownika; na tym etapie nadal korzystamy z tymczasowego identyfikatora `USER_ID`, identycznie jak w oryginalnym pliku.
2. Walidacja wejścia przez Zod: dla `sessionId` konwersja z `params` do liczby, kontrola zakresu; w historii brak walidacji ciała.
3. Logika biznesowa w serwisie `src/lib/services/generation.service.ts`:
   - `getGenerationMetadata` wykonuje zapytanie `select` z filtrem po `user_id` i `session_id`, zwraca `GenerationMetadataDto` lub `null`.
   - `getGenerationHistory` wybiera rekordy z `created_at >= now() - interval '30 days'`, sortuje malejąco i ogranicza liczbę wyników (np. `limit 100` lub do zapytania), mapując do `GenerationHistoryItemDto`.
4. W przypadku sukcesu API route opakowuje wynik w `ApiResponse`.
5. W przypadku błędów rzucone wyjątki lub wyniki kontrolowane zamieniane są na `ApiErrorResponse` z odpowiednim kodem statusu.

## 6. Względy bezpieczeństwa

- Wymuszenie autoryzacji poprzez weryfikację sesji z `locals.supabase`. Brak sesji → natychmiastowe `401`.
- Wszystkie zapytania do Supabase filtrowane przez dopasowanie `user_id` do zalogowanego użytkownika, co zapobiega eskalacji przy użyciu obcego `sessionId`.
- Brak udostępniania pól `user_id` lub wrażliwych danych w odpowiedzi (w DTO usuwamy `user_id`).
- Obsługa błędów bez ujawniania szczegółów SQL; w logach serwera możemy logować `error` przez `console.error`.
- Rozważenie limitu długości listy i sortowania, aby unikać DOS poprzez bardzo duże wyniki (limit 30 dni + ewentualny `limit 100`).

## 7. Obsługa błędów

- `400`: walidacja `sessionId` (pusty, ujemny, nienumeryczny). Zwracamy komunikat typu `"Invalid sessionId parameter"`.
- `401`: brak `user` w Supabase (`locals.supabase.auth.getUser()` zwróci null) lub błąd podczas odczytu sesji.
- `404`: brak rekordu dla użytkownika; przekazujemy przyjazny komunikat `"Generation session not found"`.
- `500`: wyjątki z Supabase (`error` z `.select`), inne nieoczekiwane błędy; logowanie `console.error`, odpowiedź `"Unexpected server error"`.
- Brak tworzenia wpisów w `generation_error`, ponieważ endpointy są tylko do odczytu; istniejące błędy pozostają niezmienione.

## 8. Wydajność

- Zapytanie z `eq('user_id', userId)` i `eq('session_id', sessionId)` korzysta z indeksu PK, co zapewnia O(1) wyszukiwanie.
- Historia ograniczona do 30 dni oraz zamówiona malejąco, co redukuje liczbę wierszy; można nałożyć `limit` (np. 200) dla dodatkowej ochrony.

## 9. Etapy wdrożenia

1. Przeniesienie pliku `src/pages/api/generations.ts` do `src/pages/api/generations/index.ts`, aktualizacja ewentualnych importów/odwołań w dokumentacji.
2. Dodanie do `generation.schema.ts` walidatora `generationSessionIdSchema` (oraz ewentualnej funkcji pomocniczej do konwersji parametru).
3. Rozszerzenie `generation.service.ts` o funkcje `getGenerationMetadata` i `getGenerationHistory`, wraz z obsługą błędów i mapowaniem do DTO.
4. Utworzenie pliku `src/pages/api/generations/[sessionId].ts` z szablonem `APIRoute` i eksportem `GET`.
5. Dodanie w tym pliku walidacji parametru `sessionId` opartej na `generationSessionIdSchema` oraz pobranie tymczasowego użytkownika (`USER_ID`) z kontekstu.
6. Integracja `getGenerationMetadata` i budowa odpowiedzi `ApiResponse`, zwracanie kodów 200/404 oraz logowanie wyjątków Supabase.
7. Uzupełnienie obsługi błędów w `[sessionId].ts` dla przypadków 400/401/500 (zawiera mapowanie komunikatów do `ApiErrorResponse`).
8. Aktualizacja `src/pages/api/generations/index.ts`: dodanie eksportu `GET` i wstrzyknięcie stałego `USER_ID`.
9. Implementacja w `index.ts` logiki wywołującej `getGenerationHistory`, mapowanie wyników do `GenerationHistoryItemDto` i zwracanie `ApiResponse`.
10. Uzupełnienie `index.ts` o obsługę błędów 401/500 oraz logowanie wyjątków.
