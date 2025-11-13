# API Endpoint Implementation Plan: Flashcards Resource

## 1. Przegląd punktu końcowego
Moduł flashcards udostępni zestaw endpointów REST w Astro obsługujących Supabase. Umożliwi autoryzowanemu użytkownikowi listowanie, pobieranie, tworzenie, aktualizację i usuwanie fiszek. Logika filtrowania, weryfikacji decków i powiązań z generacjami zostanie wydzielona do `src/lib/services/flashcard.service.ts`, a walidacja trafi do `src/lib/validation/flashcard.schema.ts`, utrzymując spójność z istniejącym stylem projektu i zasadami czystego kodu.

## 2. Szczegóły żądania
**GET `/api/flashcards`**
- Parametry: `deck_id` (opcjonalna dodatnia liczba całkowita; wymaga potwierdzenia istnienia decku), `unassigned` (opcjonalna flaga logiczna akceptująca wyłącznie `true`; zestawiona z `deck_id` skutkuje błędem walidacji), `sort` (opcjonalna wartość z `created_asc|created_desc|updated_asc|updated_desc`, domyślnie `updated_asc`), `source` (opcjonalna wartość `ai_full|ai_edited|manual`), `space_repetition` (opcjonalna wartość `OK|NOK|not_checked`); wszystkie parametry będą parsowane i walidowane przez Zod.
- Nagłówki: `Authorization` (MVP korzysta z `DEFAULT_USER_ID`, lecz kod musi zwrócić 401 przy braku użytkownika), `Accept: application/json`.
- Body: brak.

**GET `/api/flashcards/:id`**
- Parametry: `id` w ścieżce jako dodatni integer (walidacja Zod z zabezpieczeniem przed wartościami spoza zakresu safe integer).
- Nagłówki: jak wyżej.
- Body: brak.

**POST `/api/flashcards`**
- Body: `CreateFlashcardsCommand` z polami `deck_id` (number lub null) i `flashcards` (tablica o min. długości 1); każdy element zawiera , `front` (trimowany string ≤200), `back` (trimowany string ≤500), `source` (`ai_full|ai_edited|manual`), `generation_id` (wymagany dla źródeł AI, null dla manual). Walidacja sprawdza spójność pól i usuwa puste wpisy po trimowaniu.
- Parametry zapytania: brak.
- Nagłówki: `Content-Type: application/json`, `Accept: application/json`.

**PATCH `/api/flashcards/:id`**
- Parametry: `id` w ścieżce (jak powyżej).
- Body: `UpdateFlashcardCommand` zawierający dowolne podzbiorcze pola (`front`, `back`, `deck_id`); co najmniej jedno pole musi być obecne; `front/back` trimowane i walidowane długością; `deck_id` weryfikowane jak w POST.
- Nagłówki: `Content-Type: application/json`, `Accept: application/json`.

**DELETE `/api/flashcards/:id`**
- Parametry: `id` w ścieżce (jak powyżej).
- Body: brak.
- Nagłówki: `Accept: application/json`.

## 3. Wykorzystywane typy
- Istniejące DTO i modele z `src/types.ts`: `FlashcardDto`, `FlashcardCreatedDto`, `FlashcardUpdatedDto`, `CreateFlashcardsCommand`, `CreateFlashcardItemCommand`, `UpdateFlashcardCommand`, `FlashcardSource`, `SpaceRepetitionStatus`, `FlashcardInsert`, `ApiResponse`, `ApiErrorResponse`.
- Nowe schematy Zod w `flashcard.schema.ts`: `flashcardListQuerySchema`, `flashcardIdSchema`, `createFlashcardsSchema`, `updateFlashcardSchema`, oraz typy inferowane (`FlashcardListQueryInput`, `FlashcardIdInput`, `CreateFlashcardsInput`, `UpdateFlashcardInput`).
- Nowe domenowe elementy w serwisie: `FlashcardErrorCodes` (np. `FLASHCARD_NOT_FOUND`, `FLASHCARD_DECK_NOT_FOUND`, `FLASHCARD_GENERATION_NOT_FOUND`, `FLASHCARD_SOURCE_CONFLICT`, `FLASHCARD_DATABASE_ERROR`) i ewentualne helpery do deduplikacji decków/generacji.

## 4. Szczegóły odpowiedzi
- `GET /api/flashcards` zwraca `ApiResponse<FlashcardDto[]>` (200):

```json
{
  "data": [
    {
      "id": 1,
      "deck_id": 1,
      "source": "ai_full",
      "front": "What is the Pythagorean theorem?",
      "back": "a² + b² = c² where c is the hypotenuse",
      "space_repetition": "not_checked",
      "last_repetition": null,
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-01T10:00:00Z"
    }
  ]
}
```

- `GET /api/flashcards/:id` zwraca `ApiResponse<FlashcardDto>` (200); brak danych skutkuje 404.
- `POST /api/flashcards` zwraca `ApiResponse<FlashcardCreatedDto[]>` (201) z nowo utworzonymi rekordami:

```json
{
  "data": [
    { "id": 2, "front": "What is mitosis?", "back": "Cell division resulting in two identical daughter cells" },
    { "id": 3, "front": "What is meiosis?", "back": "Cell division producing gametes with half the chromosomes" }
  ]
}
```

- `PATCH /api/flashcards/:id` zwraca `ApiResponse<FlashcardUpdatedDto>` (200) zawierające `id` i aktualny `deck_id`.
- `DELETE /api/flashcards/:id` zwraca 204 No Content.
- Błędy zwracają `ApiErrorResponse` z odpowiednimi kodami (`INVALID_INPUT`, `DECK_NOT_FOUND`, `FLASHCARD_NOT_FOUND`, `GENERATION_NOT_FOUND`, `DATABASE_ERROR`, `INTERNAL_ERROR`) i statusem dopasowanym do scenariusza.

## 5. Przepływ danych
**GET `/api/flashcards`**: Handler pobiera `locals.supabase`, waliduje parametry Zodem, weryfikuje istnienie żądanego decku (korzystając z `getDeckById`) oraz normalizuje flagę `unassigned`. Serwis buduje zapytanie do Supabase (`from("flashcards")`) filtrowane po `user_id`, opcjonalnie `deck_id`, `source`, `space_repetition`, oraz `is("deck_id", null)` dla unassigned, a także stosuje sortowanie według mapy dla opcji `created/updated`. Wynik mapowany jest do `FlashcardDto`, po czym handler opakowuje go w `ApiResponse`.

**GET `/api/flashcards/:id`**: Handler waliduje param `id`, serwis pobiera pojedynczą fiszkę filtrując po `user_id` i `id`, zwraca rekord lub zgłasza `FLASHCARD_NOT_FOUND`; handler przekształca wyjątek na 404 lub 500.

**POST `/api/flashcards`**: Handler bezpiecznie parsuje JSON (obsługa błędu `request.json()`), waliduje schemat, deduplikuje wszystkie nie-nullowe `deck_id` i sprawdza je hurtowo (jedno zapytanie `in` + porównanie liczebności); weryfikuje, że wszystkie `generation_id` należą do użytkownika (`from("generations")` z `.in("session_id", ids)` i `eq("user_id", userId)`) i że źródła AI mają ustawione identyfikatory. Serwis wstawia rekordy (`insert` z `select("id, front, back")`) w transakcyjnym podejściu Supabase (pojedyncze `insert` z tablicą), aktualizuje `source` gdy wymagane, i zwraca `FlashcardCreatedDto[]`.

**PATCH `/api/flashcards/:id`**: Handler waliduje param i body, serwis najpierw pobiera bieżący rekord by zweryfikować właściciela i stan źródła; przy zmianie decku weryfikuje nowy deck; przy zmianie treści, jeśli pierwotny `source` to `ai_full`, update ustawia `source` na `ai_edited`. Aktualizacja wykonywana jest poprzez `update(...).eq("user_id", userId).eq("id", id).select("id, deck_id")`. Serwis mapuje brak rekordu na `FLASHCARD_NOT_FOUND`.

**DELETE `/api/flashcards/:id`**: Handler waliduje param, serwis usuwa rekord `delete({ count: "exact" })` z filtrami `user_id` i `id`; `count === 0` generuje `FLASHCARD_NOT_FOUND`; sukces kończy się pustą odpowiedzią 204.

We wszystkich przepływach handler korzysta z `DEFAULT_USER_ID` tylko w ramach MVP i zwraca 401, jeśli w przyszłości braknie identyfikatora użytkownika w `locals`.

## 6. Względy bezpieczeństwa
Walidacja wejścia (Zod) zapobiega SQL injection i niepoprawnym typom, a wszystkie zapytania Supabase filtrują po `user_id`, uniemożliwiając dostęp do cudzych danych. Weryfikacja `deck_id` i `generation_id` gwarantuje, że użytkownik może korzystać tylko z własnych zasobów. Logowanie błędów ograniczymy do `console.error` w serwisie; tabela `generation_error` nie jest wykorzystywana, ponieważ endpoint nie obsługuje generacji AI. Dane w odpowiedziach nie będą zawierały wewnętrznych identyfikatorów użytkownika ani szczegółów błędów Supabase.

## 7. Obsługa błędów
- 400: niepoprawny JSON, błędne kombinacje parametrów (`deck_id` + `unassigned`), naruszenia schematu (np. długości pól), brak wymaganych `generation_id` dla źródeł AI.
- 401: brak uwierzytelnionego użytkownika w `locals.supabase`.
- 404: brakujący deck przy filtracji lub zmianie decku, brakująca fiszka przy GET/PATCH/DELETE, brakująca sesja generacji dla podanego `generation_id`.
- 409: nie jest przewidywany w aktualnej specyfikacji; w razie wykrycia duplikatów front/back pozostawiamy decyzję produktową na później.
- 500: pozostałe błędy Supabase lub nieprzewidziane wyjątki, logowane i ujednolicone jako `DATABASE_ERROR` lub `INTERNAL_ERROR`.

## 8. Wydajność
Filtrowanie i sortowanie będzie realizowane po indeksowanych kolumnach (`user_id`, `deck_id`, `created_at`, `updated_at`), co Supabase obsługuje wydajnie. Weryfikacja decków i generacji zostanie zrealizowana pojedynczymi zapytaniami z klauzulą `in`, minimalizując round-trip. Zapytania produkcyjne będą zwracały tylko potrzebne kolumny.

## 9. Kroki implementacji
1. Utwórz `src/lib/validation/flashcard.schema.ts`, `src/lib/services/flashcard.service.ts`, `src/pages/api/flashcards/index.ts` oraz `src/pages/api/flashcards/[flashcardId]/index.ts`, dodając w każdym pliku minimalny szkielet i funkcje eksportowane z komentarzami `TODO` (bez logiki).
2. Zaimplementuj `flashcard.schema.ts`, uzupełniając wszystkie schematy Zod oraz eksporty typów inferowanych.
3. Zaimplementuj w serwisie `listFlashcards` wraz z niezbędnymi helperami walidującymi decki/generacje.
4. Uzupełnij handler `GET` w `src/pages/api/flashcards/index.ts`, wykorzystując `listFlashcards` i obsługę błędów.
5. Dodaj w serwisie funkcję `getFlashcardById`, zwracającą `FlashcardDto` lub rzucającą `FLASHCARD_NOT_FOUND`.
6. Zaimplementuj handler `GET` w `src/pages/api/flashcards/[flashcardId]/index.ts`, korzystając z `getFlashcardById`.
7. Rozszerz serwis o `createFlashcards`, obejmując walidację decków/generacji i mapowanie wyników.
8. Dodaj handler `POST` w `src/pages/api/flashcards/index.ts`, wywołujący `createFlashcards` i zwracający 201.
9. Uzupełnij serwis o `updateFlashcard`, obsługując zmianę decku i źródła.
10. Zaimplementuj handler `PATCH` w `src/pages/api/flashcards/[flashcardId]/index.ts`, korzystając z `updateFlashcard`.
11. Dodaj w serwisie funkcję `deleteFlashcard`, zgłaszającą `FLASHCARD_NOT_FOUND` przy braku rekordu.
12. Uzupełnij handler `DELETE` w `src/pages/api/flashcards/[flashcardId]/index.ts`, wywołujący `deleteFlashcard`.

