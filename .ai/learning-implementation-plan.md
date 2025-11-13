# API Endpoint Implementation Plan: /api/learn

## 1. Przegląd punktu końcowego
- **GET `/api/learn/:deckId`**: zwraca fiszki wymagające powtórki zgodnie z algorytmem spaced repetition (priorytet `not_checked`/`NOK`, następnie `OK` starsze niż 1 dzień, gwarancja co najmniej 10% kart `OK`, jeśli dostępne). Korzysta z limitu wyników, oblicza metadane (`total_due`, `returned`, `deck_total`).
- **PATCH `/api/learn/review`**: przyjmuje serię ocen (`OK`/`NOK`) użytkownika dla konkretnych fiszek, aktualizuje kolumnę `space_repetition`, a wyzwalacz `trigger_manage_last_repetition` automatycznie aktualizuje `last_repetition`. Służy do zamykania cyklu nauki po zakończonej sesji.

## 2. Szczegóły żądania
- **GET `/api/learn/:deckId`**
  - Metoda HTTP: GET
  - Struktura URL: `/api/learn/:deckId`
  - Parametry wymagane: `deckId` (path, dodatni bigint)
  - Parametry opcjonalne: `limit` (query, liczba całkowita 1–50, domyślnie 50)
  - Nagłówki: `Authorization: Bearer <token>`
  - Walidacja: Zod (`deckId` → `z.coerce.number().int().positive()`, `limit` → `z.coerce.number().int().min(1).max(50)` z `default(50)`)
  - Typ wejściowy: `deckId` z parametrów trasy, `limit` z query string
- **PATCH `/api/learn/review`**
  - Metoda HTTP: PATCH
  - Struktura URL: `/api/learn/review`
  - Parametry: brak w URL
  - Nagłówki: `Authorization: Bearer <token>`, `Content-Type: application/json`
  - Treść żądania:
```json
{
  "review": [
    { "flashcard_id": 4, "response": "OK" },
    { "flashcard_id": 5, "response": "NOK" }
  ]
}
```
  - Walidacja: Zod (`ReviewFlashcardsCommand` = `z.object({ review: z.array(z.object({ flashcard_id: z.coerce.number().int().positive(), response: z.enum(["OK","NOK"]) })).min(1).max(100) })`)
  - Typ wejściowy: nowy `ReviewFlashcardsCommand` (opakowuje istniejący `ReviewFlashcardCommand`)

## 3. Szczegóły odpowiedzi
- **GET `/api/learn/:deckId`**
  - Kod 200:
```json
{
  "data": [
    { "id": 1, "front": "What is the Pythagorean theorem?", "back": "a² + b² = c² where c is the hypotenuse" }
  ],
  "meta": { "total_due": 15, "returned": 1, "deck_total": 45 }
}
```
  - Błędy: `401` (brak uwierzytelnienia), `404` (brak decku lub brak uprawnień do decku), `400` (błędne parametry), `500` (awaria Supabase)
  - Typ wyjściowy: `ApiResponse<LearnResponseDto>`
- **PATCH `/api/learn/review`**
  - Kod 200:
```json
{ "data": { "updated": 2 } }
```
  - Błędy: `401` (brak uwierzytelnienia), `404` (co najmniej jedna fiszka nie należy do użytkownika), `400` (niepoprawne dane wejściowe), `500` (awaria Supabase)
  - Typ wyjściowy: `ApiResponse<{ updated: number }>`

## 4. Przepływ danych
- **GET**:
  - Autoryzacja poprzez `locals.supabase.auth.getUser()`; przerwij z `401`, jeśli brak sesji.
  - Walidacja `deckId` i `limit`, w razie błędu natychmiast `400`.
  - Potwierdź istnienie decku (`decks`) z dopasowaniem `user_id`; brak → `404`.
  - Serwis `fetchDueFlashcards` (w `src/lib/services/learn.service.ts`) pobiera:
    - Liczebność `deck_total` (COUNT wszystkich fiszek użytkownika w decku).
    - Liczebność `total_due` (COUNT fiszek spełniających kryteria algorytmu).
    - Listę fiszek: najpierw `not_checked`/`NOK` posortowane wg `updated_at`, następnie `OK` z `last_repetition <= now() - interval '1 day'`, aż do limitu, z gwarancją co najmniej 10% wpisów `OK` (drugi query z `ceil(limit * 0.1)`)
    pod warunkiem ze tyle występuje.
  - Serwis scala wyniki, usuwa duplikaty, przycina do limitu, ustawia `returned = data.length`.
  - Endpoint zwraca `LearnResponseDto`.
- **PATCH**:
  - Autoryzacja identyczna.
  - Walidacja Zod żądania; błąd → `400`.
  - Serwis `applyFlashcardReviews`:
    - Wyciąga identyfikatory fiszek i pobiera je (SELECT `id`, `user_id`) z filtrem `user_id`.
    - Jeśli którejkolwiek brakuje → zwróć `404`.
    - Dla każdej fiszki wykonuje aktualizację `space_repetition` i `updated_at = now()` przez `supabase.from("flashcards").update(...)` w pętli z `Promise.allSettled` lub poprzez przygotowaną funkcję SQL (opcjonalnie). Wszystkie zapytania zawierają filtry `id` + `user_id`.
    - Zlicza udane aktualizacje i zwraca liczbę.
  - Supabase trigger uzupełnia `last_repetition`.

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie tokenem Supabase; brak → `401`.
- Filtr `user_id` w każdym zapytaniu zapewnia zgodność z RLS i zapobiega ujawnieniu cudzych fiszek.
- Walidacja limity i typów chroni przed wstrzyknięciem SQL oraz nadużyciem zasobów.
- Brak ujawniania detali błędów Supabase w odpowiedzi; logowanie po stronie serwera (Astro logger).
- Rozważyć rate limiting (np. middleware) dla ochrony przed nadużyciem endpointów nauki.

## 6. Obsługa błędów
- `400 Bad Request`: walidacja parametrów lub payloadu (`deckId`, `limit`, struktura `review`, duplikaty identyfikatorów).
- `401 Unauthorized`: brak lub wygasła sesja Supabase.
- `404 Not Found`: deck nieistniejący lub nie należący do użytkownika; fiszka z żądania review nieznaleziona.
- `500 Internal Server Error`: nieprzewidziana awaria Supabase/PostgREST; odpowiedź zawiera przyjazny komunikat, szczegóły w logach serwera.
- Reaguj wcześnie (guard clauses) zgodnie z wytycznymi clean code, każde źródło błędu kończy przetwarzanie.

## 7. Wydajność
- Limity (max 50 kart) ograniczają liczbę zwracanych rekordów.
- Dwa zapytania SELECT (priorytetowe i `OK`) plus zliczenia — agreguj w `Promise.all` dla równoległości.
- Batch update w PATCH może być zoptymalizowany poprzez pojedynczą funkcję SQL (opcjonalna iteracja), ale początkowo wystarczy równoległe aktualizacje dla paczek ≤100.
- Cache po stronie klienta nie jest konieczny, lecz można dodać krótkie TTL w przyszłości.

## 8. Kroki implementacji
1. Utwórz szkielet funkcji w `src/lib/services/learn.service.ts` i plikach endpointów z pustymi (TODO) implementacjami; funkcje powinny zwracać np. `Promise<never>` lub rzucać `new Error("TODO")`.
2. Dodaj w serwisie obsługę zapytań dla GET (`fetchDueFlashcards`) ograniczoną do pobierania danych z bazy, bez logiki selekcji (oznaczoną jako TODO do późniejszego rozszerzenia).
3. Zaimplementuj `src/pages/api/learn/[deckId].ts`, wykorzystując aktualny serwis GET do obsługi autoryzacji, walidacji i zwracania danych.
4. Rozbuduj serwis o funkcję dla PATCH (`applyFlashcardReviews`) z minimalną logiką aktualizacji statusów (bez obliczeń związanych z algorytmem).
5. Zaimplementuj `src/pages/api/learn/review.ts`, delegując walidację i aktualizacje do serwisu PATCH.
6. Uzupełnij logikę selekcji fiszek w `fetchDueFlashcards`, realizując priorytety i gwarancję co najmniej 10% kart `OK`, a następnie przeprowadź te
sty i refaktoryzację TODO.

