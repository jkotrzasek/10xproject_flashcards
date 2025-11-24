## Plan implementacji widoku Generator AI

## 1. Przegląd

Widok Generator AI umożliwia wklejenie długiego tekstu (1000–10000 znaków), synchronizację z backendem w celu wygenerowania propozycji fiszek, przegląd i edycję propozycji, selekcję (akceptacja/odrzucenie), a następnie zapis zaakceptowanych fiszek do wybranego decka. Widok egzekwuje dzienny limit generacji, rozróżnia zapis bez zmian jako `ai_full` oraz zapis po edycji jako `ai_edited`, obsługuje częściowe niepowodzenia zapisu i aktualizuje metadane sesji generowania (accepted_total).

## 2. Routing widoku

Ścieżka: `/generator`

- Pliki:
  - `src/pages/generator.astro` – strona Astro z identycznym układem jak `src/pages/index.astro` (owinięta w `Layout.astro`), montująca `GeneratorPage` z `client:load`.
  - `src/components/GeneratorPage.tsx` – główny komponent React.
  - `src/components/generation/files.tsx` - reszta komponentów react związanych z generowaniem
## 3. Struktura komponentów

- `GeneratorPage` (kontener widoku)
  - `Header` (tytuł, opis, badge limitu)
    - `LimitBadge`
  - `AIInputForm`
  - `GenerationSkeleton` (overaly blokujący podczas generacji)
  - `AIProposalList`
    - `AIProposalRow` × N
  - `FooterActions`
    - `DeckSelect`
    - `SaveAcceptedButton`
    - `SaveAllButton`
  - `InlineError` (obszar błędów globalnych)
  - `PartialSaveAlert` (komunikat o częściowym zapisie)
  - `Toast` (powiadomienia sukces/błąd)

## 4. Szczegóły komponentów

### GeneratorPage
- Opis: Główny kontener logiczny i wizualny widoku. Odpowiada za orkiestrację stanu, zapytań do API i render hierarchii UI.
- Główne elementy: nagłówek, formularz wejściowy, lista propozycji, przyciski akcji, powiadomienia.
- Obsługiwane interakcje:
  - Inicjacja generowania (submit z `AIInputForm`).
  - Akceptacja/odrzucenie i edycja propozycji (propagowane z `AIProposalRow`).
  - Wybór decka (`DeckSelect`), zapis zaakceptowanych lub wszystkich.
- Obsługiwana walidacja:
  - Przepuszcza walidację wejścia z `AIInputForm` (1000–10000 znaków).
  - Przed zapisem waliduje długości front/back każdej fiszki (front ≤ 200, back ≤ 500), sprawdzanie onBlur podczas edycji.
  - Blokuje generowanie, gdy `remaining === 0`.
- Typy: używa DTO (GenerationLimitDto, GenerationResultDto, FlashcardProposalDto, CreateFlashcardsCommand) oraz ViewModeli (patrz sekcja 5).
- Propsy: brak (komponent najwyższego poziomu, montowany z Astro).

### AIInputForm
- Opis: Formularz wklejania tekstu i uruchomienia generowania.
- Główne elementy: `Textarea` (Shadcn/ui + Tailwind), licznik znaków, przycisk "Generuj".
- Obsługiwane interakcje:
  - OnChange tekstu: aktualizacja długości i błędów.
  - Kliknięcie przycisku "Generuj": wywołanie POST `/api/generations`.
  - Enter w polu `Textarea`: wstawia nową linię (brak submitu formularza).
    - Formularz nie wysyła się przez Enter; `onSubmit` formularza jest blokowany (`preventDefault`), a przycisk ma `type="button"`.
- Obsługiwana walidacja:
  - Długość wejścia: 1000–10000 znaków. Poniżej/ponad – blokada przycisku i komunikat.
  - Blokada przycisku "Generuj", gdy `remaining === 0` (limit).
- Typy:
  - Wejście: `CreateGenerationCommand` ({ input_text: string }).
  - Wyjście: `ApiResponse<GenerationResultDto>`.
- Propsy:
  - `remaining: number`
  - `onGenerate(input: string): Promise<void>`
  - `isGenerating: boolean`
  - `error?: string`

### GenerationSkeleton
- Opis: Overlay blokujący UI podczas generacji (ładowanie).
- Główne elementy: pełnoekranowy `div` z półprzezroczystym tłem i `Skeleton` - wykorzystane istniejące SkeletonList.txt.
- Obsługiwane interakcje: brak.
- Walidacja: nie dotyczy.
- Typy: brak.
- Propsy: `visible: boolean`.

### AIProposalList
- Opis: Lista propozycji fiszek zwróconych przez AI (efemeryczne, w pamięci jako state).
- Główne elementy: lista `AIProposalRow`.
- Interakcje:
  - Przekazuje akcje edycji/akceptacji w dół, a zdarzenia w górę.
- Walidacja:
  - Agreguje błędy elementów (front/back).
- Typy:
  - `FlashcardProposalVM[]` (patrz sekcja 5).
- Propsy:
  - `items: FlashcardProposalVM[]`
  - `onChange(itemId: string, changes: Partial<FlashcardProposalVM>): void`

### AIProposal
- Opis: Pojedyncza propozycja fiszki z polami edycji i przełącznikiem akceptacji.
- Główne elementy: dwa pola tekstowe (front, back), checkbox/toggle "Akceptuj", wskaźniki źródła (np. tag `AI` / `Edytowane`).
- Obsługiwane interakcje:
  - Edycja `front` i `back`.
  - Toggling `accepted`.
- Obsługiwana walidacja:
  - `front` max 200 znaków.
  - `back` max 500 znaków.
  - Błędy inline dla pól.
- Typy:
  - `FlashcardProposalVM`.
- Propsy:
  - `item: FlashcardProposalVM`
  - `onChange(changes: Partial<FlashcardProposalVM>): void`

### DeckSelect
- Opis: Wybór docelowego decka (opcjonalny – można zapisać bez decka).
- Główne elementy: `Select` (Shadcn/ui), opcje z listy decków użytkownika.
- Interakcje:
  - OnChange – aktualizacja `selectedDeckId` w stanie widoku.
- Walidacja:
  - Brak twardej walidacji (null/undefined dozwolone).
- Typy:
  - `DeckDto[]` (z backendu).
- Propsy:
  - `decks: DeckDto[]`
  - `value?: number | null`
  - `onChange(value: number | null): void`
  - `disabled?: boolean`

### SaveAcceptedButton / SaveAllButton (w `FooterActions`)
- Opis: Przyciski akcji do zapisu fiszek.
- Główne elementy: `Button` Shadcn/ui.
- Interakcje:
  - `SaveAccepted` – zapisuje tylko oznaczone `accepted === true`.
  - `SaveAll` – masowo ustawia `accepted = true` dla wszystkich i zapisuje.
- Walidacja:
  - Zablokowane, jeśli brak propozycji lub brak zaakceptowanych (dla SaveAccepted).
  - Blokowane w trakcie zapisu.
- Typy: korzystają z `CreateFlashcardsCommand`.
- Propsy:
  - `disabled: boolean`
  - `onClick(): Promise<void>`
  - `isSaving: boolean`

### LimitBadge
- Opis: Badge z informacją o limicie dziennym generacji.
- Główne elementy: `Badge` Shadcn/ui.
- Interakcje: brak.
- Walidacja: brak.
- Typy: `GenerationLimitDto`.
- Propsy:
  - `limit: GenerationLimitDto`

### InlineError
- Opis: Blok wyświetlania błędów globalnych widoku.
- Główne elementy: `Alert`/`Callout`.
- Interakcje: zamknięcie lub automatyczne ukrycie po czasie.
- Walidacja: brak.
- Typy: komunikat błędu i opcjonalny kod.
- Propsy:
  - `message?: string`
  - `code?: string`

### PartialSaveAlert
- Opis: Komunikat o częściowym zapisie – ile pozycji zapisano, ile pozostało do ponowienia.
- Główne elementy: `Alert` z licznikiem i przyciskiem „Spróbuj ponownie”.
- Interakcje: ponowny zapis niezapisanych elementów.
- Walidacja: brak.
- Typy: statystyki zapisu.
- Propsy:
  - `savedCount: number`
  - `totalAttempted: number`
  - `onRetry(): Promise<void>`
  - `visible: boolean`

## 5. Typy

Wykorzystanie istniejących DTO:
- `GenerationLimitDto` { daily_limit: number; used_today: number; remaining: number }
- `GenerationResultDto` { session_id: number; status: "success" | ...; generated_total: number; flashcards_proposals: FlashcardProposalDto[] }
- `FlashcardProposalDto` { front: string; back: string }
- `CreateFlashcardsCommand` { deck_id?: number | null; source: "ai_full" | "ai_edited" | "manual"; generation_id: number | null; flashcards: { front: string; back: string }[] }
- `ApiResponse<T>` { data: T }

Nowe ViewModele (frontend):

1) `FlashcardProposalVM`
- `id: string` – lokalny identyfikator (np. uuid) do śledzenia w liście.
- `index: number` – oryginalna pozycja w wynikach.
- `originalFront: string`
- `originalBack: string`
- `front: string` – aktualna edytowana wartość.
- `back: string` – aktualna edytowana wartość.
- `accepted: boolean`
- `isEdited: boolean` – pochodna: `front !== originalFront || back !== originalBack`.
- `errors?: { front?: string; back?: string }`
- `savingState?: "idle" | "saving" | "saved" | "error"`
- `errorCode?: string` – z API zapisu, jeśli dotyczy.

2) `GenerationSessionVM`
- `sessionId: number`
- `status: "idle" | "generating" | "ready" | "error"`
- `generatedTotal: number`
- `acceptedTotal: number` – liczba zaakceptowanych (do PATCH).
- `error?: { message: string; code?: string }`

3) `LimitsVM`
- `dailyLimit: number`
- `usedToday: number`
- `remaining: number`
- `isExhausted: boolean` – pochodna: `remaining <= 0`

4) `SaveStats`
- `attempted: number`
- `saved: number`
- `failed: number`

## 6. Zarządzanie stanem

- Lokalny stan w `GeneratorPage` (React 19):
  - `limits: LimitsVM | null`
  - `inputText: string`
  - `session: GenerationSessionVM`
  - `proposals: FlashcardProposalVM[]`
  - `selectedDeckId: number | null | undefined`
  - `isGenerating: boolean`
  - `isSaving: boolean`
  - `partialSave: SaveStats | null`
  - `globalError?: { message: string; code?: string }`

- Hooki niestandardowe:
  - `useGenerationLimits()` – GET `/api/generations/limits`, odświeżane on mount i po sukcesie generacji.
  - `useGenerate()` – POST `/api/generations`; zarządza `isGenerating`, mapuje `FlashcardProposalDto[]` → `FlashcardProposalVM[]`.
  - `useDecks()` – GET `/api/decks` (dla `DeckSelect`), zwraca `DeckDto[]`.
  - `useSaveFlashcards()` – rozdziela na `ai_full` (nieedytowane) i `ai_edited` (edytowane), realizuje dwa równoległe POST `/api/flashcards`, aktualizuje `partialSave`.
  - `usePatchAcceptedTotal()` – PATCH `/api/generations/:sessionId/accepted` po udanym zapisie (sumaryczna liczba zapisanych).

- Pochodne/mema:
  - `acceptedCount = proposals.filter(p => p.accepted).length`
  - `hasValidationErrors = proposals.some(p => p.errors?.front || p.errors?.back)`
  - `readyToSave = acceptedCount > 0 && !hasValidationErrors && !isSaving`

## 7. Integracja API

1) GET `/api/generations/limits`
- Response: `ApiResponse<GenerationLimitDto>`
- Użycie: na start widoku; blokada „Generuj”, gdy `remaining === 0`; badge z limitem.

2) POST `/api/generations`
- Request: `CreateGenerationCommand` { input_text }
- Sukces: `ApiResponse<GenerationResultDto>` – mapowanie `flashcards_proposals` → `FlashcardProposalVM[]`, ustawienie `session.sessionId`, `generatedTotal`.
- Błędy typowe: `400 INVALID_INPUT`, `429 DAILY_LIMIT_EXCEEDED`, `500 AI_*`.

3) POST `/api/flashcards` (×2 równolegle)
- Komenda bazowa: `CreateFlashcardsCommand`
  - `deck_id`: `selectedDeckId` lub `null`
  - `source`: `ai_full` dla nieedytowanych, `ai_edited` dla edytowanych
  - `generation_id`: `session.sessionId`
  - `flashcards`: mapowanie `{ front, back }` wyłącznie dla `accepted === true`
- Sukces: `ApiResponse<FlashcardCreatedDto[]>` (lista zapisanych).
- Błędy: `404 DECK_NOT_FOUND`/`GENERATION_NOT_FOUND`, `500 DATABASE_ERROR`, walidacyjne `400 INVALID_INPUT`.

4) PATCH `/api/generations/:sessionId/accepted`
- Request: `{ accepted_total: number }` – liczba faktycznie zapisanych pozycji (sumarycznie z obu wywołań).
- Sukces: 200 (brak treści).
- Błędy: `404 NOT_FOUND`, `400 EXCEEDS_GENERATED_TOTAL | INVALID_INPUT`, `500 DATABASE_ERROR`.

5) GET `/api/decks` (istniejący endpoint)
- Response: `ApiResponse<DeckDto[]>` – do zasilenia `DeckSelect`.

## 8. Interakcje użytkownika

- Wklejenie tekstu → walidacja długości na żywo → „Generuj” aktywne tylko dla 1000–10000 znaków i gdy limit niewyczerpany.
- Klik „Generuj” → overlay `GenerationSkeleton` → po sukcesie: lista propozycji.
- Edycja front/back w wierszach → walidacja długości → znacznik „Edytowane”.
- Toggling akceptacji wiersza → zliczanie `acceptedCount`.
- Wybór decka (opcjonalny) → wpływa na treść zapytań POST `/api/flashcards`.
- „Zapisz zaakceptowane” → zapisuje wyłącznie wiersze `accepted`.
- „Zapisz wszystkie” → ustawia `accepted = true` dla wszystkich i zapisuje.
- Sukces zapisu → Toast + usunięcie pozycji zapisanych z listy; `partialSave` jeśli nie wszystkie się zapisały.
- „Spróbuj ponownie” w `PartialSaveAlert` → ponowne wysłanie niezapisanych.

## 9. Warunki i walidacja

- Wejście tekstowe: 1000–10000 znaków (blokada „Generuj”).
- Limit: `remaining === 0` → disabled „Generuj”.
- Propozycje:
  - `front` ≤ 200, `back` ≤ 500 – walidacja inline; zablokuj zapis, gdy dowolny błąd.
  - Dla `SaveAccepted`: `acceptedCount > 0` – inaczej disabled.
- Zapis:
  - Rozdzielenie na `ai_full` (nieedytowane) i `ai_edited` (edytowane).
  - `generation_id` wymagane dla `ai_full` oraz dla `ai_edited` (przekazujemy ten sam `sessionId`).
  - `deck_id` może być `null`.
  - Po sukcesie – PATCH `accepted_total` sumą zapisanych pozycji (≤ `generated_total`).

## 10. Obsługa błędów

- Generowanie:
  - `429 DAILY_LIMIT_EXCEEDED` → komunikat + odśwież limit badge, zablokuj „Generuj”.
  - `500 AI_TIMEOUT`/`AI_RESPONSE_INVALID`/`AI_GENERATION_ERROR` → `InlineError` z komunikatem; pozwól na ponowną próbę.
  - `400 INVALID_INPUT` → wskaż problem długości.
- Zapis:
  - Walidacja pól front/back – uniemożliwia wysłanie.
  - `404 DECK_NOT_FOUND` → komunikat i podświetlenie `DeckSelect`.
  - `404 GENERATION_NOT_FOUND` → komunikat globalny, zablokuj zapis (wymaga ponownej generacji).
  - Częściowy sukces: policz zapisane vs oczekiwane; nieskasowane wiersze pozostają, mają `savingState="error"`, pokazuj `PartialSaveAlert`.
- PATCH accepted:
  - `400 EXCEEDS_GENERATED_TOTAL` → log + zablokuj dalsze PATCH do czasu weryfikacji liczników (powinno być nieosiągalne przy poprawnej logice).
- Sieć/offline:
  - Globalne błędy sieciowe → `InlineError` + retry.

## 11. Kroki implementacji

## 11. Kroki implementacji

1) Szkielet strony
   - Dodaj `src/pages/generator.astro` z układem jak w `src/pages/index.astro` (użyj `Layout.astro` i montuj `GeneratorPage` z `client:load`; tytuł: „Generator - AI Flashcard Generator”).
   - Utwórz katalog `src/components/generation`.

2) Nagłówek + limit
   - UI: sekcja tytułu i opisu; `LimitBadge`.
   - Hook: zaimplementuj `useGenerationLimits()` i użyj go tutaj (GET `/api/generations/limits`), pokaż `remaining` i zablokuj generowanie przy `remaining === 0`.

3) Formularz wejścia i sterowanie Enter
   - UI: `AIInputForm` z `Textarea`, licznikiem znaków, przyciskiem „Generuj”.
   - Zachowanie: Enter w `Textarea` dodaje nową linię; brak autosubmita; przycisk ma `type="button"`.
   - Walidacja: 1000–10000 znaków; od tego zależy `disabled` przycisku.
   - Hook: brak nowego hooka na tym etapie; stan lokalny `inputText`.

4) Generowanie i overlay
   - UI: `GenerationSkeleton` (overlay) podczas żądania.
   - Hook: dopiero teraz zaimplementuj `useGenerate()` – POST `/api/generations`:
     - mapuje `flashcards_proposals` → `FlashcardProposalVM[]`,
     - ustawia `session.sessionId`, `generatedTotal`,
     - zarządza `isGenerating`.
   - Po sukcesie: pokaż `AIProposalList`.

5) Lista propozycji i edycja
   - UI: `AIProposalList` i elementy `AIProposal` z edycją front/back i togglem akceptacji.
   - Walidacja inline: front ≤ 200, back ≤ 500 (sprawdzanie onBlur i przy zmianie).
   - Stan: `proposals: FlashcardProposalVM[]` z polami `accepted`, `isEdited`, `errors`.
   - Hook: brak nowego hooka – wszystko w stanie lokalnym.

6) Wybór decka
   - UI: `DeckSelect` w `FooterActions`.
   - Hook: dopiero tu zaimplementuj `useDecks()` – GET `/api/decks` do zasilenia opcji.

7) Zapis fiszek
   - UI: `SaveAcceptedButton` i `SaveAllButton`.
   - Hook: dopiero tu zaimplementuj `useSaveFlashcards()`:
     - rozdziela zapis na `ai_full` (nieedytowane) i `ai_edited` (edytowane),
     - wysyła dwa równoległe POST `/api/flashcards`,
     - aktualizuje listę (usuwa zapisane), wylicza `partialSave`.
   - Po sukcesie zapisu: zaimplementuj i wywołaj `usePatchAcceptedTotal()` (PATCH `/api/generations/:sessionId/accepted`) z sumą faktycznie zapisanych.

8) Komunikaty i błędy
   - UI: `InlineError`, `PartialSaveAlert`, `Toast`.
   - Obsłuż 429 dla generacji, walidacje pól, częściowe zapisy i błędy sieciowe.

9) Testy ręczne - po stronie użytkownika. Nie wykonuj automatycznie


