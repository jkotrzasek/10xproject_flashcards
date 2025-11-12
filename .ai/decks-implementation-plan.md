# API Endpoint Implementation Plan: Decks REST API

## 1. Przegląd punktu końcowego
Zestaw punktów końcowych `GET /api/decks`, `GET /api/decks/:id`, `POST /api/decks`, `PATCH /api/decks/:id`, `DELETE /api/decks/:id` oraz `POST /api/decks/:id/reset-progress` ma umożliwić użytkownikom zarządzanie taliami fiszek oraz resetowanie postępów nauki. Każde żądanie pracuje w kontekście zalogowanego użytkownika i wykorzystuje Supabase do trwałego przechowywania danych oraz Astro API Routes jako warstwę HTTP.

## 2. Szczegóły żądania
Metody HTTP obejmują odpowiednio GET, POST, PATCH, DELETE i POST (dla resetu), a struktury URL korzystają z katalogu `src/pages/api/decks/` z dynamicznym segmentem `[deckId]` dla operacji na pojedynczym zasobie. Parametry obejmują opcjonalny query param `sort` dla listy talii z wartościami `name_asc`, `name_desc`, `created_asc`, `created_desc`, `updated_asc`, `updated_desc` oraz parametry ścieżki `deckId` (konwertowane do liczby całkowitej dodatniej). Treści żądań JSON wymagają modelu `CreateDeckCommand` (`{ "name": string }`) oraz `UpdateDeckCommand` (`{ "name": string }`), walidowanych przez nowy `deck.schema.ts`. Wszystkie żądania muszą odczytać użytkownika z `locals.supabase` (tymczasowo `DEFAULT_USER_ID` dla MVP) i natychmiast zakończyć się kodem 401, jeśli brak kontekstu uwierzytelnienia.

Przykładowe treści żądań:

```json
GET /api/decks?sort=updated_desc
```

```json
GET /api/decks/42
```

```json
POST /api/decks
{ "name": "Biology" }
```

```json
PATCH /api/decks/42
{ "name": "Advanced Biology" }
```

```json
DELETE /api/decks/42
```

```json
POST /api/decks/42/reset-progress
```

## 3. Szczegóły odpowiedzi
Lista talii zwraca `ApiResponse<DeckDto[]>`, pojedyncza talia `ApiResponse<DeckDto>`, utworzenie talii `ApiResponse<DeckCreatedDto>`, aktualizacja `ApiResponse<DeckUpdatedDto>`, a operacje DELETE i reset-progress zwracają 204 bez treści. W przypadku błędów zwracamy `ApiErrorResponse` z opisanym kodem. Przykładowe odpowiedzi sukcesu:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Mathematics",
      "created_at": "2025-11-01T10:00:00Z",
      "updated_at": "2025-11-10T12:00:00Z",
      "flashcard_count": 45
    }
  ]
}
```

```json
{
  "data": {
    "id": 2,
    "name": "Advanced Biology"
  }
}
```

## 4. Przepływ danych
Każdy handler APIRoute pobiera `supabase` z `locals`, ustala `userId`, a następnie deleguje logikę do nowego serwisu `deck.service.ts`. Serwis udostępnia funkcje `getDecks`, `getDeckById`, `createDeck`, `updateDeckName`, `deleteDeck`, `resetDeckProgress`, przyjmujące SupabaseClient oraz identyfikatory. Funkcja listująca buduje zapytanie z sortowaniem, dołącza relację `flashcards(count)` i zwraca mapowanie do `DeckDto`. Funkcja szczegółowa filtruje po `user_id` i `id`, dołączając licznik fiszek. Operacja tworzenia wstawia rekord z `user_id`, obsługuje konflikt unikatowości i zwraca identyfikator. Aktualizacja wykonuje `update` z warunkami `user_id` i `id`, aktualizuje `updated_at` (postgREST wywołuje trigger). Usuwanie usuwa talię (cascade zadziała po stronie bazy). Reset postępu aktualizuje wszystkie fiszki przypisane do talii, ustawiając `space_repetition` na `'not_checked'` oraz `last_repetition` na `null`. Wejściowy `deckId` jest parsowany z segmentu ścieżki na liczbę całkowitą, a następnie walidowany względem dodatniej wartości przed przekazaniem do serwisu, aby uchwycić błędy formatu zanim trafią do Supabase. Wszystkie funkcje zwracają jawne błędy domenowe, aby API mogło zmapować je na statusy HTTP.

## 5. Względy bezpieczeństwa
Każde zapytanie musi być filtrowane po `user_id`, aby zapobiec odczytowi lub modyfikacji cudzych zasobów. W przypadku braku zalogowanego użytkownika zwracamy 401 bez wykonywania zapytań. Walidacja wejścia przez Zod ogranicza długość nazwy do 1-30 znaków i usuwa puste spacje (trim). `deck.service.ts` nie interpoluje ręcznie zapytań SQL, korzysta wyłącznie z metod Supabase, redukując ryzyko wstrzyknięć. Warto dodać rejestrowanie poważnych błędów przez `console.error` oraz zachować ostrożność przy podawaniu komunikatów zwracanych do klienta, nie ujawniając szczegółów bazy danych.

## 6. Obsługa błędów
Błędy walidacji JSON lub schematu skutkują 400 z kodem `INVALID_JSON` albo `INVALID_INPUT`. Brak uwierzytelnienia to 401 z kodem `UNAUTHORIZED`. Próbę dostępu do nieistniejącej talii zwracamy 404 z kodem `DECK_NOT_FOUND`. Konflikt nazwy rozpoznajemy po kodzie błędu Supabase `23505` i mapujemy na 409 z kodem `DECK_NAME_CONFLICT`. Inne błędy Supabase lub wewnętrzne otrzymują 500 z kodem `INTERNAL_ERROR`. Reset-progress i delete, jeśli talia nie istnieje lub nie należy do użytkownika, również zwracają 404. Nie zapisujemy błędów w tabeli `generation_error` - błędy są tylko zwracane w API.

## 7. Wydajność
Lista talii wykorzystuje pojedyncze zapytanie z agregacją `flashcards(count)` zamiast iteracyjnych zliczeń, co minimalizuje round-tripy. Sortowanie odpowiada indeksom Postgresa na kluczach (domyślne indeksy po PK oraz `updated_at` wspierane przez triggers). Warto zadbać o limit wyników (np. implicitny limit 100) w zapytaniu, aby uniknąć zwracania ogromnych kolekcji, oraz dodać przyszłościowo stronicowanie. Reset postępu wykonuje pojedyncze zbiorcze update, co jest bardziej wydajne niż iteracje po rekordach.

## 8. Kroki implementacji
Krok 1: Utwórz pełną strukturę plików: puste `src/lib/validation/deck.schema.ts`, `src/lib/services/deck.service.ts`, `src/pages/api/decks/index.ts`, `src/pages/api/decks/[deckId]/index.ts`, `src/pages/api/decks/[deckId]/reset-progress.ts`, wraz z eksportami placeholder (np. komentarze).  
Krok 2: W `deck.schema.ts` dodaj zdefiniowane schematy Zod oraz walidator parametru `sort`.  
Krok 3: W `deck.service.ts` zaimplementuj funkcję `createDeck`, obsługę konfliktu nazwy i błędów, oraz powiązane typy domenowe.  
Krok 4: W `src/pages/api/decks/index.ts` dodaj logikę POST `/api/decks`, korzystając z walidacji i serwisu z kroku 3.  
Krok 5: W `deck.service.ts` dodaj funkcje `getDecks` i `getDeckById` wraz z mapowaniem do DTO.  
Krok 6: W `src/pages/api/decks/index.ts` dodaj logikę GET `/api/decks` korzystającą z `getDecks` oraz obsługę parametru `sort`.  
Krok 7: W `src/pages/api/decks/[deckId]/index.ts` zaimplementuj GET `/api/decks/:id`, w tym parsowanie `deckId` i obsługę błędów `DECK_NOT_FOUND`.  
Krok 8: W `deck.service.ts` dodaj funkcje `updateDeckName`wraz z odpowiednią obsługą konfliktów i braku zasobu.  
Krok 9: W `src/pages/api/decks/[deckId]/index.ts` dodaj logikę DELETE wykorzystującą nowe funkcje serwisu oraz wspólną walidację `deckId`.
Krok 10: W `deck.service.ts` dodaj funkcje  `deleteDeck`, wraz z odpowiednią obsługą konfliktów i braku zasobu.  
Krok 11: W `src/pages/api/decks/[deckId]/index.ts` dodaj logikę PATCH wykorzystującą nowe funkcje serwisu oraz wspólną walidację `deckId`.
Krok 12: W `deck.service.ts` dodaj `resetDeckProgress` aktualizującą fiszki powiązane z talią.  
Krok 13: W `src/pages/api/decks/[deckId]/reset-progress.ts` zaimplementuj POST resetu postępu z wykorzystaniem `resetDeckProgress`.  

