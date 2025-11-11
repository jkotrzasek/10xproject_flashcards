# API Endpoint Implementation Plan: POST /api/generations

## 1. Przegląd punktu końcowego
- Cel: synchroniczne wygenerowanie propozycji fiszek przez usługę AI na podstawie dostarczonego tekstu źródłowego.
- Kontekst: endpoint dostępny dla uwierzytelnionych użytkowników; zapisuje metadane sesji w tabeli `generations` i ewentualne błędy w `generation_error`.
- Wynik: zwrócenie identyfikatora sesji, statusu generowania, liczby wygenerowanych fiszek oraz propozycji nieutrwalonych w bazie.

## 2. Szczegóły żądania
- Metoda HTTP: POST
- Struktura URL: `/api/generations`
- Nagłówki: `Authorization: Bearer <jwt>` (Supabase), `Content-Type: application/json`
- Body: `CreateGenerationCommand` (`{ input_text: string }`), walidacja Zod (trim), długość 1000-10000 znaków oraz sprawdzenie czy po trim nie jest puste.
- Przykładowy JSON request:
```json
{
  "input_text": "Photosynthesis is a process used by plants..."
}
```
- Walidacja dodatkowa: obliczyć `input_text_length`, policzyć liczbę słów (opcjonalna metryka do logowania), z góry odrzucić payloady przekraczające limit po zakodowaniu UTF-8.
- Typy używane po stronie wejścia: `CreateGenerationCommand` (żądanie), `ApiErrorResponse` (odpowiedzi błędne).
- Weryfikacje biznesowe: autoryzacja użytkownika z `context.locals.supabase`, egzekwowanie dziennego limitu generacji (z istniejącej logiki lub nowej metody w serwisie), wykrywanie duplikatów przez MD5 `input_text_hash`.

## 3. Szczegóły odpowiedzi
- Sukces (200): `ApiResponse<GenerationResultDto>` z polami `session_id`, `status`, `generated_total`, `flashcards_proposals` (tablica `FlashcardProposalDto`).
- Przykładowy JSON response (200):
```json
{
  "data": {
    "session_id": 42,
    "status": "success",
    "generated_total": 12,
    "flashcards_proposals": [
      {
        "front": "What is photosynthesis?",
        "back": "Process by which plants convert light energy into chemical energy."
      },
      {
        "front": "What is mitochondria?",
        "back": "Organelle responsible for producing ATP in eukaryotic cells."
      }
    ]
  }
}
```
- Przykładowy JSON błędu (400/401/429):
```json
{
  "error": {
    "message": "Input text must be between 1000 and 10000 characters.",
    "code": "INVALID_INPUT"
  }
}
```
- Przykładowy JSON błędu (500):
```json
{
  "error": {
    "message": "AI generation failed. Please try again later.",
    "code": "AI_GENERATION_ERROR"
  }
}
```
- Walidacja odpowiedzi: upewnić się, że `flashcards_proposals` spełniają ograniczenia długości front/back (<=200/500) zanim wrócą do klienta; w razie naruszenia przetwarzać jako błąd 500 i zapisać w `generation_error`.
- Brak tworzenia rekordów w `flashcards`; dane pozostają efemeryczne w odpowiedzi.

## 4. Przepływ danych
- Żądanie trafia do trasy Astro (`src/pages/api/generations.ts` lub dedykowanej ścieżki) i korzysta z `context.locals.supabase` do potwierdzenia sesji użytkownika.
- Walidator Zod mapuje payload do `CreateGenerationCommand`; w razie błędu zwraca 400.
- Logika kontrolera deleguje do nowego serwisu, np. `src/lib/services/generation.service.ts`, z następującymi krokami:
  1. Obliczenie `input_text_hash` za pomocą `crypto` (MD5) oraz zapis `input_text_length`.
  2. Sprawdzenie limitów dziennych (współdzielony serwis limitów, jeśli już istnieje, lub nowa metoda działająca na `generations`).
  3. Stworzenie rekordu `generations` ze statusem `pending` przy użyciu Supabase (Insert zwraca `session_id`).
  4. Wywołanie klienta AI z limitem czasu 60s poprzez `AbortController`.
  5. Po sukcesie: aktualizacja rekordu `generations` (`status='success'`, `generated_total`, `updated_at`).
  6. Zwrot danych do kontrolera, który formatuje odpowiedź zgodnie z `GenerationResultDto`.
- W przypadku błędów AI lub Supabase, serwis aktualizuje `generations` (`status='error'`) i tworzy rekord `generation_error` w jednej transakcji (Supabase `rpc` lub `supabase.from(...).insert` wykonywane sekwencyjnie, z kompensacją w razie niepowodzenia).

## 5. Względy bezpieczeństwa
- Wymagane uwierzytelnienie: odczyt aktywnego użytkownika poprzez `context.locals.supabase.auth.getUser()`; brak użytkownika => 401.
Na tym etapie użyć domyślnego użytkownika z pliku `src/db/supabase.client.ts`
- Autoryzacja: potwierdzić, że `generations.user_id` zawsze odpowiada zalogowanemu użytkownikowi; używać wstawiania z `user.id` z sesji, bez zaufania do inputu.
- Sanityzacja: ograniczyć długość `input_text`, usuwać znaki kontrolne, ewentualnie normalizacja Unicode NFC przed hashowaniem żeby uniknąć kolizji duplikatów.
- Ochrona danych: nie logować pełnego `input_text`; logować tylko hash i długość. W odpowiedziach unikać informacji o wewnętrznych kodach błędów AI (zachować w `generation_error`).
- Rate limiting: enforce dzienny limit (429) oraz rozważyć dodatkowe ograniczenie per-request (np. blokada w serwisie limitów).

## 6. Obsługa błędów
- 400 Bad Request: niepoprawne body (Zod), tekst po trim krótszy niż 1000 znaków lub dłuższy niż 10000.
- 401 Unauthorized: brak ważnego tokena Supabase.
- 429 Too Many Requests: przekroczony dzienny limit generacji (serwis limitów zwraca kod i komunikat).
- 500 Internal Server Error: wyjątki z AI, błędy zapisu do Supabase, naruszenia integralności (np. brak możliwości aktualizacji rekordu). W tych przypadkach serwis ustawia `status='error'` i dodaje wpis do `generation_error` (`error_code`, `message`).
- Zapisywanie błędów: rekord `generation_error` zawiera `session_id`, `user_id`, generowany `error_code` (np. `AI_TIMEOUT`, `AI_RESPONSE_INVALID`), szczegół w `message`. Brak wpisu przy 400/401/429.
- Logowanie serwerowe: `console.error` lub wspólny logger z ograniczeniem danych wejściowych; do logów przekazywać tylko hash i identyfikatory.

## 7. Wydajność
- Hashowanie i liczenie długości wykonywać jednokrotnie; unikać kopiowania dużych stringów (używać `Buffer.byteLength`).
- Zapytania Supabase grupować w minimalnej liczbie round-tripów: insert + update w jednej transakcji (Supabase `rpc` lub `supabase.transaction` jeśli dostępne) albo w logicznym bloku z kontrolą błędów.
- Wywołania AI zabezpieczyć timeoutem (np. 60 s) i obsłużyć abort, aby nie blokować workera.
- Rozważyć asynchroniczne przetwarzanie odpowiedzi AI, aby skrócić czas generacji

## 8. Kroki implementacji
1. Dodać schemat Zod (`createGenerationSchema`) w `src/lib/validation/generation.schema.ts` (jeśli katalog nie istnieje, utworzyć zgodnie ze strukturą) i wyeksportować helper funkcji walidującej.
2. Utworzyć serwis `src/lib/services/generation.service.ts`, zawierający funkcje: `ensureDailyLimit`, `createPendingGeneration`, `finalizeGenerationSuccess`, `finalizeGenerationError`.
3. Dodać połączenie klienta AI, który na ten moment będzie jedynie MOCKowanymi danymi wygenerowanych fiszek.
4. Zaimplementować trasę API `src/pages/api/generations.ts` (lub `.astro` jeśli wymaga) pobierając `context.locals.supabase`, walidując wejście, delegując do serwisu i zwracając sformatowaną odpowiedź (`ApiResponse`).
5. Zaimplementować logikę błędów: w catch blokach korzystać z metod serwisu do aktualizacji statusów i zapisów w `generation_error`, mapować wyjątki na odpowiednie statusy HTTP.
