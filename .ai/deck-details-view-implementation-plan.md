## Plan implementacji widoku „Szczegóły decku”

### 1. Przegląd

Widok „Szczegóły decku” odpowiada za prezentację pojedynczego decku użytkownika (`/decks/:id`) wraz z listą wszystkich przypisanych do niego fiszek.  
Główne cele widoku: umożliwić podgląd podstawowych informacji o decku (nazwa, liczba fiszek), zarządzać fiszkami (edycja/usuń), resetować postęp nauki w decku oraz rozpocząć naukę z danego decku.  
Widok opiera się na istniejących endpointach:
- `GET /api/decks/:id` – pobranie metadanych decku (w tym `flashcard_count`),
- `POST /api/decks/:id/reset-progress` – reset postępu nauki dla wszystkich fiszek w decku,
- `GET /api/flashcards?deck_id=:id` – pobranie fiszek przypisanych do decku,
- `PATCH /api/flashcards/:id` – edycja treści fiszki,
- `DELETE /api/flashcards/:id` – usunięcie fiszki.

Widok musi być spójny stylistycznie z Dashboardem, widokiem „Nieprzypisane” i generatorem AI (Astro + React 19 jako wyspy, Tailwind 4, komponenty shadcn/ui, toasty), renderować treść fiszek jako plain text (`whitespace-pre-wrap`) i zapewniać dobre A11Y (etykiety, focus management w dialogach, jasne komunikaty błędów).

### 2. Routing widoku

- **Ścieżka URL:** `/decks/:id`.
- **Plik routingu Astro:** `src/pages/decks/[id].astro` (dynamiczny segment `id`).
  - Pobiera parametr `id` z `Astro.params.id`, parsuje go do liczby (`deckId`).
  - Renderuje Reactową wyspę `DeckDetailsPage` (np. z `src/components/deck/DeckDetailsPage.tsx`) z przekazanym propsem `deckId`.
- **Struktura layoutu:**
  - Strona powinna używać tego samego „AppShella”/headera co `index.astro`, `generator.astro` i `decks/unassigned.astro` (wspólna nawigacja, przycisk „Wyloguj” itd.).
  - Główna zawartość w `<main class="container mx-auto px-4 py-8">` dla spójnego odstępu.
- **SEO/UX:**
  - Ustawienie tytułu strony, np. `Deck: [nazwa decku] – AI Flashcards` (początkowo może być placeholder typu `Szczegóły decku – AI Flashcards`, z aktualizacją po załadowaniu danych w React).
  - Strona dostępna wyłącznie dla zalogowanego użytkownika (w przyszłości guard auth; obecnie MVP z `DEFAULT_USER_ID`).

### 3. Struktura komponentów

Główne komponenty widoku i ich hierarchia:

- **`DeckDetailsPage`** (React, główna wyspa widoku)
  - Odpowiada za:
    - pobranie danych decku (`GET /api/decks/:id`),
    - pobranie listy fiszek w decku (`GET /api/flashcards?deck_id=:id`),
    - zarządzanie stanem listy (pseudopaginacja „Załaduj więcej”),
    - inicjowanie mutacji (reset postępu decku, edycja/usunięcie fiszek).
  - **Dzieci / sekcje:**
    - `DeckHeader`
    - `DeckFlashcardList`
    - `DeckEmptyState` (warunkowo)
    - `DeckErrorState` (warunkowo)
    - `FlashcardEditDialog` (sterowany z poziomu strony)
    - globalny `Toaster` (jeśli nie ma już w AppShellu).

- **`DeckHeader`**
  - Prezentuje nazwę decku, licznik fiszek oraz główne akcje:
    - „Zresetuj postęp”,
    - „Ucz się” (link do `/learn/:deckId`),
    - „Dodaj fiszkę” (link do `/manual?deckId=:id`).
  - Korzysta z komponentów shadcn/ui (`Button`, `DropdownMenu` lub `Dialog`, `Input`).

- **`DeckFlashcardList`**
  - Prezentacyjna lista fiszek w decku.
  - Obsługuje stany:
    - początkowe ładowanie (skeletony),
    - „Załaduj więcej” (pseudo-paginacja),
    - pusty stan (gdy brak fiszek).
  - **Dzieci:**
    - wiele `DeckFlashcardItem`
    - `LoadMoreButton` (Button shadcn/ui).

- **`DeckFlashcardItem`**
  - Reprezentuje pojedynczą fiszkę.
  - Pokazuje treść (front/back), status powtórek i źródło (`source`).
  - Zawiera przyciski:
    - „Edytuj” (otwiera `FlashcardEditDialog`),
    - „Usuń” (uruchamia `ConfirmDialog` i potem `DELETE`).

- **`FlashcardEditDialog`**
  - Dialog (shadcn/ui `Dialog`) do edycji treści fiszki (`front`/`back`).
  - Zawiera formularz z walidacją (długość, niepusty tekst) i przyciski „Zapisz” / „Anuluj”.
  - Wywołuje `PATCH /api/flashcards/:id` po zatwierdzeniu.

- **`ConfirmDialog` (re-używalny)**  
  - Ogólny dialog potwierdzenia operacji destrukcyjnych:
    - reset postępu,
    - usunięcie fiszki.
  - Bazuje na shadcn/ui `AlertDialog` lub `Dialog`.

Hooki stanu / logiki:

- `useDeckDetails(deckId)` – pobieranie/synchronizacja metadanych decku.
- `useDeckFlashcards(deckId)` – pobieranie i zarządzanie listą fiszek w decku.
- `useDeckMutations(deckId)` – mutacje decku związane z resetem postępu nauki.
- `useDeckFlashcardMutations(deckId)` – mutacje fiszek (edycja/usunięcie) z aktualizacją lokalnego stanu listy.

### 4. Szczegóły komponentów

#### `DeckDetailsPage`

- **Opis komponentu**
  - Główny komponent strony `/decks/:id`.
  - Łączy dane z hooków (`useDeckDetails`, `useDeckFlashcards`, `useDeckMutations`, `useDeckFlashcardMutations`) i przekazuje je do komponentów prezentacyjnych.
  - Zarządza stanem widoku (ładowanie, błędy, pseudo-paginacja, aktualnie edytowana fiszka).

- **Główne elementy**
  - `<main className="container mx-auto px-4 py-8">`.
  - Sekcja błędu globalnego (`DeckErrorState`), gdy nie udało się pobrać decku lub fiszek.
  - Sekcja nagłówka: `DeckHeader` (renderowana, gdy dane decku są dostępne).
  - Sekcja pustego stanu:
    - `DeckEmptyState`, gdy `flashcards.length === 0` i brak błędów.
  - Lista:
    - `DeckFlashcardList` – gdy są fiszki lub trwa ładowanie.
  - `FlashcardEditDialog` – sterowany via stan (`editingFlashcardId`), renderowany jako sibling na końcu drzewa.

- **Obsługiwane interakcje**
  - Inicjalne pobranie:
    - Po montażu, równoległe wywołania:
      - `useDeckDetails(deckId)` → `GET /api/decks/:id`,
      - `useDeckFlashcards(deckId)` → `GET /api/flashcards?deck_id=:id&sort=created_asc` (lub domyślny sort).
  - Retry:
    - Przy błędzie decku lub fiszek, przycisk „Spróbuj ponownie” wywołuje `refetch` na odpowiednim hooku.
  - Pseudopaginacja:
    - `onLoadMore` zwiększa `visibleCount` w hooku `useDeckFlashcards`.
  - Edycja fiszki:
    - `onEdit(flashcardId)` ustawia `editingFlashcardId` i otwiera `FlashcardEditDialog`.
    - `onSaveEdit` wywołuje mutację z `useDeckFlashcardMutations`.
  - Usuwanie fiszki:
    - `onDelete(flashcardId)` otwiera `ConfirmDialog`; po potwierdzeniu wywołuje mutację z `useDeckFlashcardMutations`.
  - Operacje na decku:
    - `onResetProgress()` → `POST /api/decks/:id/reset-progress`,
    - `onStartLearn()` → nawigacja do `/learn/:deckId`.

- **Obsługiwana walidacja**
  - Nie rozpoczyna mutacji, gdy brakuje `deckId` lub dane decku nie zostały poprawnie załadowane.
  - Nie wywołuje `onLoadMore`, gdy `hasMore === false`.
  - Blokuje przyciski dla operacji trwających (`isResettingProgress`, `isLoadingMore`) – zapobiega wielokrotnym requestom.

- **Typy**
  - `DeckDto`, `FlashcardDto`, `DeckUpdatedDto`, `FlashcardUpdatedDto`.
  - ViewModel-e: `DeckHeaderVM`, `DeckFlashcardVM`, `DeckDetailsState`.

- **Propsy**
  - `deckId: number` – identyfikator decku (z routingu Astro).

#### `DeckHeader`

- **Opis komponentu**
  - Prezentacyjno-logiczny komponent górnej sekcji widoku decku.
  - Wyświetla nazwę decku, licznik fiszek oraz przyciski akcji.
  - Mapuje wymagania z US-012 (rozpoczęcie nauki), US-014 (reset postępu) i US-015 (statystyki – liczba fiszek), a także ułatwia dostęp do manualnego dodawania fiszek (US-009).

- **Główne elementy**
  - Wrapper, np.:
    - `<section className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">`.
  - Lewa część:
    - Nazwa decku (np. `h1` lub `h2`), np. `text-2xl font-semibold`.
    - Podtytuł/metadata: `flashcardCount` (np. „Fiszki: 45”), ewentualnie daty „Utworzono / Ostatnia aktualizacja” (sformatowane).
  - Prawa część:
    - Przyciski akcji:
      - `Button variant="default"` – „Ucz się” (`onStartLearn`).
      - `Button variant="outline"` – „Dodaj fiszkę” (link do `/manual?deckId=:id`, zgodnie z US-009).
      - `Button variant="destructive"` lub osobny przycisk „Zresetuj postęp” → otwiera `ConfirmDialog` informujący, że operacja jest nieodwracalna.

- **Obsługiwane interakcje**
  - Klik „Ucz się” → wywołanie `onStartLearn` (nawigacja do `/learn/:deckId` – US-012).
  - Klik „Dodaj fiszkę” → nawigacja do `/manual?deckId=:id` (manualne dodanie, US-009).
  - Reset postępu:
    - Otwarcie `ConfirmDialog` (np. treść „Czy na pewno chcesz zresetować postęp nauki w tym decku? Tej operacji nie można cofnąć.”).
    - Potwierdzenie → wywołanie `onResetProgress`.

- **Obsługiwana walidacja**
  - Blokowanie przycisków:
    - `isResettingProgress` – przyciski akcji resetu mają `disabled={true}` i wskazują `aria-busy`.

- **Typy**
  - `DeckHeaderVM` – ViewModel nagłówka (opis w sekcji „Typy”).

- **Propsy (przykładowe)**
  - `deck: DeckHeaderVM`
  - `onRenameDeck: (name: string) => Promise<void> | void`
  - `onDeleteDeck: () => Promise<void> | void`
  - `onResetProgress: () => Promise<void> | void`
  - `onStartLearn: () => void`
  - `onAddManual: () => void`

#### `DeckFlashcardList`

- **Opis komponentu**
  - Prezentacyjna lista fiszek należących do decku.
  - Zarządza wyświetlaniem elementów na podstawie pseudo-paginacji (`visibleCount`).
  - Odpowiada za prezentację stanów: ładowanie, pusty stan, „Załaduj więcej”.

- **Główne elementy**
  - Kontener listy, np. `<section className="space-y-4">`.
  - Dla każdej widocznej fiszki:
    - `DeckFlashcardItem`.
  - Pusty stan:
    - prosty blok informacyjny, np. „Ten deck nie zawiera jeszcze żadnych fiszek” plus link do „Dodaj fiszkę”.
  - Loader / skeleton:
    - np. `ListSkeleton` renderowany, gdy `isInitialLoading === true`.
  - Przycisk „Załaduj więcej”:
    - `Button` umieszczony pod listą, widoczny tylko, gdy `hasMore === true`.

- **Obsługiwane interakcje**
  - Kliknięcie „Załaduj więcej” → wywołanie `onLoadMore`.
  - Delegacja interakcji z poszczególnych elementów:
    - `onEdit(flashcardId)`,
    - `onDelete(flashcardId)`.

- **Obsługiwana walidacja**
  - Ukrycie przycisku „Załaduj więcej”, gdy:
    - `hasMore === false`, lub
    - `isLoadingMore === true`.
  - Blokada przycisku, gdy `isLoadingMore === true`.

- **Typy**
  - `DeckFlashcardVM[]` – lista widocznych fiszek.
  - Flagi boolowskie: `isInitialLoading`, `isLoadingMore`, `hasMore`.

- **Propsy (przykładowe)**
  - `items: DeckFlashcardVM[]`
  - `isInitialLoading: boolean`
  - `isLoadingMore: boolean`
  - `hasMore: boolean`
  - `onLoadMore: () => void`
  - `onEdit: (flashcardId: number) => void`
  - `onDelete: (flashcardId: number) => void`

#### `DeckFlashcardItem`

- **Opis komponentu**
  - Reprezentuje pojedynczą fiszkę w decku.
  - Pokazuje treść (przód/tył), źródło (`source`) oraz opcjonalnie status nauki (`space_repetition`) i daty.
  - Zawiera przyciski „Edytuj” i „Usuń”.
  - Mapuje wymagania US-010 (edycja fiszki) i US-011 (usuwanie fiszki).

- **Główne elementy**
  - Wrapper: np. `article` lub `div` z klasami karty (`border rounded-lg p-4 bg-card flex flex-col gap-3`).
  - Sekcja treści:
    - nagłówki „Przód” / „Tył” (np. `p` z `font-medium`),
    - treść w elementach z klasą `whitespace-pre-wrap` (plain text, brak HTML/Markdown).
  - Sekcja metadanych:
    - badge ze źródłem (`source` → „AI”, „AI (edytowana)”, „Manualna”),
    - status nauki (`space_repetition` → np. „Nie oceniona” / „OK” / „Do powtórki”),
    - daty `createdAtLabel`, `updatedAtLabel`.
  - Sekcja akcji:
    - `Button variant="outline" size="sm"` – „Edytuj”.
    - `Button variant="ghost" size="sm"` z `variant="destructive"` lub klasą „danger” – „Usuń”.

- **Obsługiwane interakcje**
  - Klik „Edytuj” → `onEdit(item.id)`.
  - Klik „Usuń” → `onDelete(item.id)` (otwarcie `ConfirmDialog` na poziomie strony).
  - Stan „w trakcie operacji”:
    - przyciski mogą być disabled, gdy `isDeleting === true` lub `isEditing === true`.

- **Obsługiwana walidacja**
  - Brak walidacji formularzowej – komponent nie wykonuje bezpośrednio requestów, jedynie deleguje akcje w górę.
  - Zapewnienie, że front/back zawsze renderowane jako plain text (brak możliwości wstrzyknięcia HTML).

- **Typy**
  - `DeckFlashcardVM` – pełne dane potrzebne do wyświetlenia karty.

- **Propsy (przykładowe)**
  - `item: DeckFlashcardVM`
  - `onEdit: (flashcardId: number) => void`
  - `onDelete: (flashcardId: number) => void`

#### `FlashcardEditDialog`

- **Opis komponentu**
  - Dialog do edycji treści fiszki (`front` i `back`).
  - Uruchamiany z `DeckDetailsPage` po kliknięciu „Edytuj” na konkretnej fiszce.
  - Po zapisaniu danych wywołuje `PATCH /api/flashcards/:id` (poprzez hook mutacji).
  - Spełnia wymagania US-010: możliwość zmiany przodu i tyłu fiszki; zmiana widoczna w decku oraz trybie nauki (bo dane w DB się zmieniają).

- **Główne elementy**
  - `Dialog` (shadcn/ui) z:
    - tytułem (np. „Edytuj fiszkę”),
    - formularzem zawierającym:
      - pole `Textarea` dla `front` z licznikiem znaków (maks. 200),
      - pole `Textarea` dla `back` z licznikiem znaków (maks. 500),
      - inline błędy pod polem (np. `FormError`).
    - przyciskami w stopce:
      - „Anuluj”,
      - „Zapisz” (`variant="default"`, z `loading`).

- **Obsługiwane interakcje**
  - Otwarcie dialogu z wypełnieniem pól aktualną treścią fiszki.
  - Edycja pól (kontrolowane komponenty).
  - Klik „Zapisz”:
    - waliduje formularz,
    - jeśli walidacja przejdzie, wywołuje `onSubmit({ front, back })`.
  - Po sukcesie:
    - zamyka dialog,
    - pokazuje toast „Fiszka zaktualizowana”.

- **Obsługiwana walidacja**
  - Front:
    - wymagany, długość 1–200 znaków (bez nadmiarowych spacji na końcach).
  - Back:
    - wymagany, długość 1–500 znaków.
  - Walidacja inline z wykorzystaniem np. Zod po stronie klienta, aby zachować spójność z backendem.
  - Brak wysyłania requestu, gdy wartości nie uległy zmianie.

- **Typy**
  - `EditFlashcardFormValues` – opisane w sekcji „Typy”.

- **Propsy (przykładowe)**
  - `open: boolean`
  - `flashcard?: DeckFlashcardVM`
  - `isSaving: boolean`
  - `error?: string`
  - `onOpenChange: (open: boolean) => void`
  - `onSubmit: (values: EditFlashcardFormValues) => Promise<void> | void`

### 5. Typy

#### Istniejące typy backendowe

- **`DeckDto`** (z `src/types.ts`)
  - `Omit<Deck, "user_id">` + `flashcard_count: number`.
  - Pola istotne dla widoku:
    - `id: number`
    - `name: string`
    - `created_at: string` (ISO)
    - `updated_at: string` (ISO)
    - `flashcard_count: number`

- **`FlashcardDto`**
  - `Omit<Flashcard, "user_id" | "generation_id">`.
  - Pola wykorzystywane w tym widoku:
    - `id: number`
    - `deck_id: number | null` (powinien być równy `deckId` tej strony)
    - `source: FlashcardSource` (`"ai_full" | "ai_edited" | "manual"`)
    - `front: string`
    - `back: string`
    - `space_repetition: SpaceRepetitionStatus` (`"OK" | "NOK" | "not_checked"`)
    - `last_repetition: string | null`
    - `created_at: string`
    - `updated_at: string`

- **`FlashcardUpdatedDto`**
  - Zwracany przez `PATCH /api/flashcards/:id`:
    - `id: number`
    - `deck_id: number | null`
  - Używany głównie do potwierdzenia, że operacja się powiodła (ID i ewentualnie nowy deck).

- **Komendy**
  - `UpdateFlashcardCommand` – `Partial<Pick<FlashcardInsert, "front" | "back" | "deck_id">>` – body dla `PATCH /api/flashcards/:id`.

- **Wrappery odpowiedzi**
  - `ApiResponse<T>`:
    ```ts
    interface ApiResponse<T> {
      data: T;
    }
    ```
  - `ApiErrorResponse`:
    ```ts
    interface ApiErrorResponse {
      error: {
        message: string;
        code?: string;
      };
    }
    ```

#### Nowe typy ViewModel / frontendowe

- **`DeckHeaderVM`**
  - Reprezentacja metadanych decku używana w nagłówku:
  ```ts
  interface DeckHeaderVM {
    id: number;
    name: string;
    flashcardCount: number;
    createdAtLabel: string;
    updatedAtLabel: string;
    isResettingProgress: boolean;
    error?: string;
  }
  ```

- **`DeckFlashcardVM`**
  - Reprezentacja fiszki w widoku szczegółów decku:
  ```ts
  interface DeckFlashcardVM {
    id: number;
    front: string;
    back: string;
    source: FlashcardSource;
    spaceRepetition: SpaceRepetitionStatus;
    lastRepetitionLabel: string | null;
    createdAtLabel: string;
    updatedAtLabel: string;
    isDeleting: boolean;
    error?: string;
  }
  ```

- **`DeckDetailsState`**
  - Złożony stan dla `DeckDetailsPage` (np. używany w `useReducer`):
  ```ts
  interface DeckDetailsState {
    deck: DeckHeaderVM | null;
    flashcards: DeckFlashcardVM[];
    visibleCount: number;

    isDeckLoading: boolean;
    isFlashcardsInitialLoading: boolean;
    isFlashcardsLoadingMore: boolean;

    loadDeckError?: string;
    loadFlashcardsError?: string;
    globalError?: string;
  }
  ```

- **`EditFlashcardFormValues`**
  - Dane formularza edycji fiszki:
  ```ts
  interface EditFlashcardFormValues {
    front: string;
    back: string;
  }
  ```

- **`UpdateFlashcardPayload`**
  ```ts
  interface UpdateFlashcardPayload {
    flashcardId: number;
    values: EditFlashcardFormValues;
  }
  ```

### 6. Zarządzanie stanem

- **Poziom strony (`DeckDetailsPage`)**
  - Zalecane użycie `useReducer` z typem stanu `DeckDetailsState` dla większej czytelności niż wiele `useState`.
  - Przykładowe akcje reducera:
    - `SET_DECK_LOADING` / `SET_DECK_SUCCESS` / `SET_DECK_ERROR`,
    - `SET_FLASHCARDS_LOADING` / `SET_FLASHCARDS_SUCCESS` / `SET_FLASHCARDS_ERROR`,
    - `INCREASE_VISIBLE_COUNT`,
    - `START_DELETE_FLASHCARD` / `FINISH_DELETE_FLASHCARD` / `SET_FLASHCARD_ERROR`,
    - `UPDATE_FLASHCARD_CONTENT`,
    - `SET_RESET_PROGRESS_LOADING` / `SET_RESET_PROGRESS_ERROR`,
    - `SET_GLOBAL_ERROR`.
  - Hooki efektów:
    - `useEffect` wywołujący równolegle `fetchDeck` i `fetchFlashcards` po mount.
    - `useEffect` obliczający `hasMore = visibleCount < flashcards.length`.

- **`useDeckDetails(deckId)`**
  - Odpowiada za:
    - `GET /api/decks/:id` przy montażu / refetch,
    - mapowanie `DeckDto` → `DeckHeaderVM` (formatowanie dat, ustawianie flag na `false`).
  - Eksportuje:
    - `deck: DeckHeaderVM | null`,
    - `isLoading: boolean`,
    - `error?: string`,
    - `refetch: () => Promise<void>`.

- **`useDeckFlashcards(deckId)`**
  - Odpowiada za:
    - `GET /api/flashcards?deck_id=:deckId&sort=created_asc`,
    - mapowanie `FlashcardDto[]` → `DeckFlashcardVM[]`,
    - pseudo-paginację:
      - `visibleFlashcards = flashcards.slice(0, visibleCount)`,
      - `hasMore = visibleCount < flashcards.length`,
      - `loadMore()` zwiększające `visibleCount` (np. o 20).
  - Stan:
    - `flashcards: DeckFlashcardVM[]`,
    - `visibleCount: number`,
    - `isInitialLoading: boolean`,
    - `isLoadingMore: boolean`,
    - `error?: string`.
  - Funkcje:
    - `loadMore()`,
    - `setFlashcards(...)` (aktualizacja po edycji/usunięciu),
    - `refetch()` – ponowne pobranie całości listy (użyte np. po resecie postępu).

- **`useDeckMutations(deckId)`**
  - Funkcje:
    - `resetProgress()`:
      - wykonuje `POST /api/decks/:id/reset-progress`,
      - po sukcesie:
        - pokazuje toast „Postęp nauki w decku został zresetowany”,
        - opcjonalnie wywołuje `refetch()` na `useDeckFlashcards` (jeśli w UI pokazujemy statusy).

- **`useDeckFlashcardMutations(deckId)`**
  - Przyjmuje referencję do stanu listy lub callback (np. z `useDeckFlashcards`).
  - Funkcje:
    - `updateFlashcard({ flashcardId, values })`:
      - ustawia lokalny stan `isUpdating` (opcjonalnie),
      - wykonuje `PATCH /api/flashcards/:id` z body:
        - `{ front: values.front, back: values.back }`,
      - po sukcesie:
        - aktualizuje `DeckFlashcardVM` w pamięci (front/back, `updatedAtLabel`, ewentualnie `source` → `'ai_edited'`, jeśli wcześniej był `'ai_full'` – spójnie z logiką backendu),
        - pokazuje toast o sukcesie.
      - po błędach:
        - `404` – usuwa fiszkę z listy, toast „Fiszka nie istnieje lub została usunięta”,
        - `400` – wyświetla inline błąd w dialogu,
        - `500` – toast „Nie udało się zapisać zmian, spróbuj ponownie”.
    - `deleteFlashcard(flashcardId: number)`:
      - wywołuje `DELETE /api/flashcards/:id`,
      - po sukcesie:
        - usuwa element z listy,
        - zmniejsza `flashcardCount` w `DeckHeaderVM`,
        - pokazuje toast „Fiszka została usunięta”.
      - po błędach:
        - `404` – usuwa element lokalnie, ale z komunikatem, że fiszka już nie istnieje,
        - `500` – nie usuwa elementu, pokazuje toast błędu.

### 7. Integracja API

- **`GET /api/decks/:id`**
  - Wywołanie:
    - URL: `/api/decks/${deckId}`.
    - Metoda: `GET`.
  - Sukces (200):
    - Odpowiedź: `ApiResponse<DeckDto>`.
    - Mappowanie na `DeckHeaderVM` (formatowanie dat).
  - Błędy:
    - `404 Not Found` – deck nie istnieje lub nie należy do użytkownika:
      - `DeckErrorState` z komunikatem i przyciskiem „Wróć do listy decków”.
    - `401 Unauthorized` – w przyszłości redirect do logowania.
    - `500 DATABASE_ERROR` / `INTERNAL_ERROR` – globalny błąd na stronie.

- **`POST /api/decks/:id/reset-progress`**
  - Wywołanie:
    - URL: `/api/decks/${deckId}/reset-progress`.
    - Metoda: `POST`.
  - Sukces (204):
    - Brak body.
    - Frontend:
      - pokazuje toast „Postęp nauki w decku został zresetowany”,
      - opcjonalnie wywołuje `refetch()` na `useDeckFlashcards`, jeśli w UI prezentujemy status powtórek.
  - Błędy:
    - `404` – deck nie istnieje → `DeckErrorState` + redirect.
    - `401` / `500` – toast błędu.

- **`GET /api/flashcards?deck_id=:id`**
  - Wywołanie:
    - URL: `/api/flashcards?deck_id=${deckId}&sort=created_asc` (lub inny sort, np. `updated_desc`, jeśli wygodniejsze).
    - Metoda: `GET`.
  - Sukces (200):
    - Odpowiedź: `ApiResponse<FlashcardDto[]>`.
    - Mapowanie na `DeckFlashcardVM[]`:
      - formatowanie dat,
      - `lastRepetitionLabel` w zależności od `last_repetition` i `space_repetition`.
  - Błędy:
    - `404 DECK_NOT_FOUND` – deck nie istnieje lub nie należy do użytkownika:
      - zgrywa się z błędem `GET /api/decks/:id`, pokazujemy błąd globalny.
    - `400 INVALID_INPUT` – np. niepoprawny `deck_id` (nie powinien wystąpić przy poprawnym routingu).
    - `500 DATABASE_ERROR` / `INTERNAL_ERROR` – globalny błąd listy fiszek.

- **`PATCH /api/flashcards/:id`**
  - Wywołanie:
    - URL: `/api/flashcards/${flashcardId}`.
    - Metoda: `PATCH`.
    - Body (`UpdateFlashcardCommand`), np.:
      ```json
      {
        "front": "Nowa treść przodu",
        "back": "Nowa treść tyłu"
      }
      ```
  - Sukces (200):
    - Odpowiedź: `ApiResponse<FlashcardUpdatedDto>`.
    - Frontend:
      - aktualizuje lokalne dane fiszki (front/back),
      - jeśli `source` było `ai_full`, to lokalnie ustawia `source = 'ai_edited'` (aby odzwierciedlić logikę backendu),
      - pokazuje toast o sukcesie.
  - Błędy:
    - `400 INVALID_INPUT` – nieprawidłowe dane (przekazanie błędu w dialogu).
    - `404 FLASHCARD_NOT_FOUND` – fiszka zniknęła lub nie należy do użytkownika:
      - usunięcie jej z listy i toast „Fiszka nie istnieje lub została usunięta”.
    - `404 DECK_NOT_FOUND` – mało prawdopodobne w tym widoku (nie zmieniamy `deck_id`), ale należy pokazać komunikat błędu.
    - `500 DATABASE_ERROR` / `INTERNAL_ERROR` – toast błędu.

- **`DELETE /api/flashcards/:id`**
  - Wywołanie:
    - URL: `/api/flashcards/${flashcardId}`.
    - Metoda: `DELETE`.
  - Sukces (204):
    - Frontend:
      - usuwa fiszkę lokalnie z listy,
      - zmniejsza `flashcardCount` w `DeckHeaderVM`,
      - pokazuje toast „Fiszka została usunięta”.
  - Błędy:
    - `404 FLASHCARD_NOT_FOUND` – fiszka już nie istnieje:
      - usunięcie z listy (jeśli wciąż jest) i toast z informacją.
    - `500 DATABASE_ERROR` / `INTERNAL_ERROR` – toast błędu, pozostawienie fiszki.

### 8. Interakcje użytkownika

- **Wejście na stronę `/decks/:id`**
  - Użytkownik wybiera deck na Dashboardzie; następuje nawigacja do `/decks/:id`.
  - Widok pokazuje skeletony dla nagłówka i listy fiszek (stany `isDeckLoading`, `isFlashcardsInitialLoading`).
  - Równolegle wykonywane są:
    - `GET /api/decks/:id`,
    - `GET /api/flashcards?deck_id=:id`.
  - Po sukcesie:
    - nagłówek prezentuje nazwę decku i licznik fiszek (US-015),
    - lista pokazuje pierwsze N fiszek.

- **Reset postępu nauki (US-014)**
  - Użytkownik klika „Zresetuj postęp”.
  - `ConfirmDialog` wyjaśnia, że historia powtórek zostanie wyczyszczona i że operacja jest nieodwracalna.
  - Po potwierdzeniu:
    - wykonywany jest `POST /api/decks/:id/reset-progress`,
    - po sukcesie:
      - toast „Postęp nauki w decku został zresetowany”,
      - opcjonalne odświeżenie listy fiszek, jeśli UI pokazuje statusy nauki.

- **Rozpoczęcie nauki (US-012)**
  - Użytkownik klika „Ucz się”.
  - Następuje nawigacja do `/learn/:deckId`, gdzie osobny widok używa endpointów `GET /api/learn/:deckId` i `PATCH /api/learn/review`.

- **Dodawanie fiszki (US-009)**
  - Użytkownik klika „Dodaj fiszkę” w nagłówku.
  - Przechodzi do `/manual?deckId=:id`, gdzie formularz manualnego dodawania ma prewybrany deck.
  - Po dodaniu fiszki i powrocie do `/decks/:id` (lub po ręcznym odświeżeniu) nowa fiszka jest widoczna na liście.

- **Edycja fiszki (US-010)**
  - Użytkownik klika „Edytuj” przy konkretnej fiszce (`DeckFlashcardItem`).
  - Otwiera się `FlashcardEditDialog` z aktualnymi wartościami `front`/`back`.
  - Użytkownik wprowadza zmiany i klika „Zapisz”.
  - Po walidacji:
    - wykonywany jest `PATCH /api/flashcards/:id`,
    - po sukcesie:
      - dialog się zamyka,
      - lista aktualizuje treść fiszki,
      - toast „Fiszka zaktualizowana”.

- **Usunięcie fiszki (US-011)**
  - Użytkownik klika „Usuń” przy fiszce.
  - Otwiera się `ConfirmDialog`, np. z treścią „Czy na pewno chcesz usunąć tę fiszkę?”.
  - Po potwierdzeniu:
    - wykonywany jest `DELETE /api/flashcards/:id`,
    - po 204:
      - fiszka jest usuwana z listy,
      - licznik `flashcardCount` w nagłówku jest dekrementowany,
      - toast „Fiszka została usunięta”.

- **Załadowanie większej liczby fiszek**
  - Użytkownik klika „Załaduj więcej” na dole listy.
  - `DeckFlashcardList` wywołuje `onLoadMore`, zwiększając `visibleCount`.
  - Jeśli po zwiększeniu `visibleCount` osiągnie `flashcards.length`, przycisk znika.

### 9. Warunki i walidacja

- **Warunki po stronie API i ich odzwierciedlenie w UI**
  - Fiszki:
    - `front`: max 200 znaków, wymagany,
    - `back`: max 500 znaków, wymagany,
    - `source`: musi być jedną z wartości `ai_full | ai_edited | manual` (niezmieniane bezpośrednio przez UI).
    - `deck_id`: musi wskazywać istniejący deck użytkownika (w tym widoku nie zmieniamy `deck_id`).
  - Endpoints:
    - `GET /api/decks/:id` i `GET /api/flashcards?deck_id=:id` wymagają poprawnego `deckId` (parsowanie z URL, walidacja, że to liczba).
    - `PATCH /api/flashcards/:id` wymaga poprawnego body (JSON).

- **Walidacja na poziomie komponentów**
  - `DeckDetailsPage`:
    - jeśli `deckId` nie jest poprawną liczbą, nie wywołuje requestów, tylko pokazuje błąd.
    - przy błędzie 404 z `GET /api/decks/:id` traktuje deck jako nieistniejący.
  - `FlashcardEditDialog`:
    - front/back z walidacją długości i niepustej wartości,
    - brak duplikowania logiki backendu poza prostymi regułami długości.
  - `DeckFlashcardList`:
    - nie wywołuje `onLoadMore`, gdy `hasMore === false`.

- **Wpływ walidacji na stan interfejsu**
  - Błędy walidacji lokalnej zatrzymują requesty do API (komunikaty w formularzu).
  - Błędy walidacji z backendu (400/409) są mapowane na błędy w odpowiednich polach (nazwa decku, treść fiszki).
  - Widok nie „zacina się” – po błędach można ponowić operacje.

### 10. Obsługa błędów

- **Błędy pobrania decku (`GET /api/decks/:id`)**
  - 404:
    - renderuje `DeckErrorState` z komunikatem „Deck nie istnieje lub został usunięty”,
    - przycisk „Wróć do listy decków”.
  - 500 / błędy sieci:
    - podobny `DeckErrorState` z możliwością „Spróbuj ponownie”.

- **Błędy pobrania fiszek (`GET /api/flashcards?deck_id=:id`)**
  - Błąd nie blokuje całkowicie widoku:
    - nagłówek nadal może się wyświetlić (jeśli deck został pobrany),
    - lista zastępowana przez `DeckErrorState` lokalny dla sekcji listy.

- **Błędy edycji/usuwania fiszek**
  - `PATCH /api/flashcards/:id`:
    - 404 – usunięcie fiszki lokalnie i toast „Fiszka nie istnieje lub została usunięta”.
    - 400 – prezentacja błędów w dialogu edycji (np. zbyt długi tekst).
    - 500 / network – toast „Nie udało się zapisać zmian, spróbuj ponownie”.
  - `DELETE /api/flashcards/:id`:
    - 404 – traktowanie jak sukces z informacją, że fiszka została już usunięta.
    - 500 – toast błędu, fiszka pozostaje.

- **Błędy operacji na decku (reset postępu)**
  - Reset postępu:
    - 404 – `DeckErrorState` + redirect,
    - 500 – toast błędu, nie zmienia się żaden stan lokalny.

- **Edge cases**
  - Użytkownik szybko klika kilka razy tę samą akcję:
    - podczas `isResettingProgress` i `isLoadingMore` przyciski są disabled.
  - Brak fiszek w decku:
    - zamiast błędu – `DeckEmptyState` z sugestią dodania fiszek (link do generatora).

### 11. Kroki implementacji

1. **Przygotowanie routingu**
   - Utworzyć plik `src/pages/decks/[id].astro`.
   - Wczytać dynamiczny parametr `id`, sparsować do liczby `deckId` i przekazać jako prop do `DeckDetailsPage`.
   - Zapewnić, że strona korzysta z tego samego layoutu / AppShella co pozostałe widoki (header, nawigacja).

2. **Utworzenie komponentu `DeckDetailsPage`**
   - Utworzyć plik `src/components/deck/DeckDetailsPage.tsx`.
   - Zaimplementować podstawowy szkielet: `<main>`, `DeckHeader`, placeholder listy.
   - Dodać stan (np. `useReducer` z `DeckDetailsState`) i logikę pobierania `GET /api/decks/:id` oraz `GET /api/flashcards?deck_id=:id`.

3. **Implementacja hooków `useDeckDetails` i `useDeckFlashcards`**
   - Utworzyć folder `src/components/deck/hooks/`.
   - W `useDeckDetails(deckId)`:
     - wykonać `GET /api/decks/:id`,
     - mapować `DeckDto` → `DeckHeaderVM`.
   - W `useDeckFlashcards(deckId)`:
     - wykonać `GET /api/flashcards?deck_id=:id&sort=created_asc`,
     - mapować `FlashcardDto[]` → `DeckFlashcardVM[]`,
     - zaimplementować pseudo-paginację (`visibleCount`, `hasMore`, `loadMore`).

4. **Integracja hooków z `DeckDetailsPage`**
   - Połączyć wyniki hooków z reducerem `DeckDetailsState`.
   - Zaimplementować przekazywanie odpowiednich propsów do `DeckHeader` i `DeckFlashcardList`.
   - Dodać obsługę stanów błędów i pustego stanu.

5. **Implementacja komponentu `DeckHeader`**
   - Utworzyć `src/components/deck/DeckHeader.tsx`.
   - Zaimplementować UI nazwy decku, licznika fiszek i przycisków akcji („Ucz się”, „Dodaj fiszkę”, „Zresetuj postęp”).
   - Zaimplementować `ConfirmDialog` dla resetu postępu z jasnym opisem nieodwracalności operacji.

6. **Implementacja komponentu `DeckFlashcardList`**
   - Utworzyć `src/components/deck/DeckFlashcardList.tsx`.
   - Zaimplementować renderowanie listy fiszek z pseudo-paginacją oraz przyciskiem „Załaduj więcej”.
   - Obsłużyć stany `isInitialLoading`, `isLoadingMore`, `hasMore` oraz pusty stan.

7. **Implementacja komponentu `DeckFlashcardItem`**
   - Utworzyć `src/components/deck/DeckFlashcardItem.tsx`.
   - Zaimplementować layout pojedynczej fiszki (front/back, metadane, przyciski „Edytuj”/„Usuń”).
   - Zapewnić, że treść fiszki jest renderowana jako plain text (`whitespace-pre-wrap`).

8. **Implementacja komponentu `FlashcardEditDialog`**
   - Utworzyć `src/components/deck/FlashcardEditDialog.tsx`.
   - Zaimplementować formularz z walidacją (1–200/1–500 znaków) oraz obsługą błędów API.
   - W `DeckDetailsPage` dodać stan `editingFlashcardId`/`editingFlashcard` i logikę otwierania/zamykania dialogu.

9. **Implementacja hooka `useDeckMutations`**
   - Utworzyć `src/components/deck/hooks/useDeckMutations.ts`.
   - Zaimplementować funkcję `resetProgress` z wykorzystaniem endpointu `POST /api/decks/:id/reset-progress`.
   - Dodać obsługę toastów i ewentualną aktualizację lokalnego stanu (np. ponowne pobranie fiszek, jeśli w UI wyświetlane są statusy nauki).

10. **Implementacja hooka `useDeckFlashcardMutations`**
    - Utworzyć `src/components/deck/hooks/useDeckFlashcardMutations.ts`.
    - Zaimplementować `updateFlashcard` oraz `deleteFlashcard` z użyciem `PATCH /api/flashcards/:id` i `DELETE /api/flashcards/:id`.
    - Zadbać o aktualizację lokalnej listy fiszek i licznika `flashcardCount`.
    
11. Testy manualne wykona użytkownik


