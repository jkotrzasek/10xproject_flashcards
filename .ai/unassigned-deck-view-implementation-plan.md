## Plan implementacji widoku „Nieprzypisane” (wirtualny deck)

### 1. Przegląd

Widok „Nieprzypisane” jest wirtualnym deckiem prezentującym wszystkie fiszki użytkownika, które nie mają przypisanego `deck_id` (tj. `deck_id = null`).  
Główny cel widoku: umożliwić szybkie przeglądanie i przypisywanie pojedynczych fiszek do istniejących decków bez kontekstu nauki (bez akcji „Ucz się”).  
Widok korzysta z istniejących endpointów:
- `GET /api/flashcards?unassigned=true` – pobranie listy nieprzypisanych fiszek,
- `GET /api/decks` – pobranie listy decków do dropdownu,
- `PATCH /api/flashcards/:id` – przypisanie fiszki do decku (zmiana `deck_id`).

Widok musi być spójny stylistycznie z `DashboardPage` i `GeneratorPage` (React + Tailwind + shadcn/ui, toasty z `sonner`), stosować plain text w treści fiszek (bez HTML/Markdown) oraz zadbać o dostępność (etykiety, focus, komunikaty błędów).
Widok musi mieć strukturę taką samą jak `generator.astro` i `index.astro`, zachowując ten sam header z przyszłym menu nawigacyjnym

### 2. Routing widoku

- **Ścieżka URL:** `/decks/unassigned` (już używana w `DashboardPage` w handlerze `handleOpenUnassigned`).
- **Pliki routingu:**
  - Nowa strona Astro: `src/pages/decks/unassigned.astro`.
  - Strona będzie renderować Reactową wyspę `UnassignedDeckPage` (z pliku `src/components/unassigned/UnassignedDeckPage.tsx`), podobnie jak istniejące widoki dashboard/generator.
- **Zachowanie SEO/UX:**
  - Ustawienie tytułu strony, np. `Nieprzypisane fiszki – AI Flashcards`.
  - Główna zawartość w `<main>` z odpowiednimi klasami Tailwind (`container mx-auto px-4 py-8`) dla spójności z resztą aplikacji.

### 3. Struktura komponentów

Główne komponenty widoku i ich hierarchia:

- **`UnassignedDeckPage`** (React, strona / wyspa)
  - zarządza stanem widoku i integracją z API,
  - używa custom hooków do pobierania danych i mutacji.
  - **Dzieci / sekcje:**
    - `UnassignedHeader` (sekcja nagłówka wewnątrz komponentu)
    - `UnassignedFlashcardList`
    - `UnassignedEmptyState` (renderowany warunkowo)
    - `UnassignedErrorState` (renderowany warunkowo)
    - globalny `Toaster` (re-użycie istniejącego komponentu).

- **`UnassignedFlashcardList`**
  - prezentacyjna lista fiszek z obsługą „load more” / pseudo-infinite scroll,
  - renderuje skeletony podczas ładowania i pusty stan, gdy brak danych.
  - **Dzieci:**
    - kolejne `UnassignedFlashcardItem`
    - `LoadMoreButton` (może być prostym przyciskiem `Button` z shadcn/ui).

- **`UnassignedFlashcardItem`**
  - pojedynczy wiersz / karta fiszki,
  - pokazuje front/back, źródło (`source`), status powtórek i daty,
  - zawiera dropdown do przypisania decku (`DeckAssignDropdown`).
  - spójny z propozycjami na ekranie `GeneratorPage.tsx`

- **`DeckAssignDropdown`**
  - dropdown z listą dostępnych decków (źródło: `GET /api/decks`),
  - odpowiedzialny za interakcję „przypisz do decku” i walidację lokalną,
  - bazuje na komponentach shadcn/ui (`Select` lub podobny).

Komponenty stanu i hooki:

- **`useUnassignedFlashcards`** – hook do pobierania i zarządzania listą nieprzypisanych fiszek (+ pseudo-paginacja).
- **`useDeckOptions`** – hook do pobrania listy decków i przemapowania na opcje dropdownu.
- **`useAssignFlashcardToDeck`** – hook do wywoływania `PATCH /api/flashcards/:id` i obsługi stanu ładowania/błędów dla operacji przypisania.

### 4. Szczegóły komponentów

#### `UnassignedDeckPage`

- **Opis komponentu**
  - Główny komponent widoku `/decks/unassigned`.
  - Łączy dane z hooków (`useUnassignedFlashcards`, `useDeckOptions`, `useAssignFlashcardToDeck`) i przekazuje je do komponentów prezentacyjnych.
  - Odpowiada za globalne stany ładowania, błędów i podstawowe akcje użytkownika (retry, load more).

- **Główne elementy**
  - `<main className="container mx-auto px-4 py-8">` – główny kontener.
  - `UnassignedHeader` – tytuł, opis, liczba nieprzypisanych fiszek.
  - Sekcja błędów globalnych (`UnassignedErrorState`).
  - Sekcja pustego stanu (`UnassignedEmptyState`), gdy lista jest pusta.
  - `UnassignedFlashcardList` – faktyczna lista fiszek z obsługą „load more”.
  - `Toaster` (z `./Toaster` lub `sonner`) – globalne komunikaty o sukcesach/błędach.

- **Obsługiwane interakcje**
  - Inicjalne pobranie danych po montażu (triggerowane w hookach).
  - „Spróbuj ponownie” przy globalnym błędzie pobierania danych.
  - Obsługa „Załaduj więcej” (pseudo-infinite scroll).
  - Obsługa przypisania fiszki (callback z `UnassignedFlashcardItem` → `useAssignFlashcardToDeck`).

- **Obsługiwana walidacja**
  - Nie wywoływanie kolejnych `loadMore`, gdy `hasMore === false`.
  - Nie wywoływanie przypisania, gdy brak dostępnych decków (`deckOptions.length === 0`) – w takim przypadku dropdowny są wyłączone i wyświetlany jest komunikat informacyjny.
  - Walidacja reakcji na błędy API – jeżeli `GET /api/flashcards` lub `GET /api/decks` zwróci błąd, widok nie próbuje dalej wykonywać działań zależnych (np. przypisywania).

- **Typy**
  - `FlashcardDto` – dane z `GET /api/flashcards`.
  - `DeckDto` – dane z `GET /api/decks`.
  - ViewModel-e: `UnassignedFlashcardVM`, `DeckOptionVM`, `UnassignedDeckState`.

- **Propsy**
  - Brak (komponent wejściowy dla widoku, wszystkie dane pobiera samodzielnie).

#### `UnassignedFlashcardList`

- **Opis komponentu**
  - Prezentacyjny komponent odpowiadający za wyrenderowanie listy widocznych fiszek oraz kontrolkę „Załaduj więcej”.
  - Nie pobiera danych samodzielnie – przyjmuje je w formie przemapowanych `UnassignedFlashcardVM`.

- **Główne elementy**
  - Kontener listy: np. `<div className="space-y-4">`.
  - Każdy element listy: `UnassignedFlashcardItem`.
  - Pusty stan: tekst/informacja, gdy `items.length === 0` i brak ładowania.
  - Loader / skeletony: re-użycie `SkeletonList` lub lekki skeleton specyficzny dla tego widoku.
  - Przycisk „Załaduj więcej” (`Button` z shadcn/ui) pod listą, widoczny gdy `hasMore === true`.

- **Obsługiwane interakcje**
  - Kliknięcie przycisku „Załaduj więcej” → wywołanie `onLoadMore`.
  - Przekazywanie interakcji z `UnassignedFlashcardItem` w górę (np. `onAssign`).

- **Obsługiwana walidacja**
  - Ukrycie przycisku „Załaduj więcej”, gdy `hasMore === false` lub `isLoadingMore === true`.
  - Zablokowanie przycisku, gdy `isLoadingMore === true` (ochrona przed spamem).
  - Komunikat, gdy liczba widocznych elementów = 0, ale wystąpił błąd przy próbie `loadMore`.

- **Typy**
  - Props ViewModel: `UnassignedFlashcardVM[]`.
  - Flagi stanu: `boolean` (`isInitialLoading`, `isLoadingMore`, `hasMore`).
  - Callbacki: funkcje typowane TS (np. `(id: number, deckId: number) => Promise<void>`).

- **Propsy (interfejs przykładowy)**
  - `items: UnassignedFlashcardVM[]`
  - `isInitialLoading: boolean`
  - `isLoadingMore: boolean`
  - `hasMore: boolean`
  - `onLoadMore: () => void`
  - `onAssign: (flashcardId: number, deckId: number) => void | Promise<void>`
  - `deckOptions: DeckOptionVM[]`

#### `UnassignedFlashcardItem`

- **Opis komponentu**
  - Reprezentuje pojedynczą nieprzypisaną fiszkę.
  - Wyświetla treść (front/back), źródło (`source`), status powtórek (`space_repetition`) oraz metadane (`created_at`, `updated_at`, sformatowane do etykiet).
  - Zawiera kontrolkę `DeckAssignDropdown` pozwalającą przypisać fiszkę do wybranego decku.

- **Główne elementy**
  - Wrapper np. `article` lub `div` z klasami kart (`border rounded-lg p-4 bg-card`).
  - Sekcja front/back:
    - Nagłówek z labelką „Przód” / „Tył”.
    - Treść z klasą `whitespace-pre-wrap` (plain text, bez interpretacji HTML).
  - Sekcja metadanych:
    - Etykieta źródła (np. chip „AI”, „AI (edytowana)”, „Manualna”) na podstawie `source`.
    - Informacja o statusie `space_repetition` (np. „Nie oceniona”, „OK”, „Do powtórki”).
    - Daty `createdAtLabel` / `updatedAtLabel`.
  - Sekcja akcji:
    - `DeckAssignDropdown`.
    - (Opcjonalnie w przyszłości) przycisk „Edytuj” odsyłający do widoku edycji fiszki.

- **Obsługiwane interakcje**
  - Zmiana wartości w `DeckAssignDropdown` → wywołanie `onAssign(flashcardId, deckId)`.
  - Pokazanie stanu „w trakcie przypisywania” (`isAssigning`) – wyłączenie dropdownu i mały spinner/tekst.

- **Obsługiwana walidacja**
  - Brak możliwości wyboru „pustej” opcji (dropdown zaczyna się od placeholdera, ale nie jest on wartością wysyłaną przy `onChange`).
  - Gdy `hasDecks === false` (brak decków), dropdown jest w trybie disabled, z opisem „Brak decków – utwórz deck w Dashboardzie”.
  - Prezentacja błędu przypisania z tego komponentu (`assignError`) jako inline tekstu pod dropdownem.

- **Typy**
  - Prop `item: UnassignedFlashcardVM`.
  - Prop `deckOptions: DeckOptionVM[]`.
  - Prop `onAssign: (flashcardId: number, deckId: number) => void | Promise<void>`.
  - Prop `isAssigning: boolean`.
  - Prop `assignError?: string`.

- **Propsy**
  - `item: UnassignedFlashcardVM`
  - `deckOptions: DeckOptionVM[]`
  - `hasDecks: boolean`
  - `onAssign: (flashcardId: number, deckId: number) => void | Promise<void>`
  - `isAssigning: boolean`
  - `error?: string`

#### `DeckAssignDropdown`

- **Opis komponentu**
  - Odpowiada za wybór docelowego decku dla danej fiszki.
  - Re-używalny, może być użyty w innych widokach (np. widok decku).

- **Główne elementy**
  - Komponent `Select` z shadcn/ui (`<Select><SelectTrigger>...<SelectContent>...</SelectContent></Select>`).
  - Etykieta (np. `label` + `aria-labelledby`) dla dostępności.
  - Informacja o błędzie (tekst pod dropdownem, np. w klasie `text-sm text-destructive`).

- **Obsługiwane interakcje**
  - Zmiana opcji (`onValueChange`) → propagacja wybranego `deckId` do rodzica.
  - Disabled w czasie przypisywania (`disabled={isAssigning || !hasDecks}`).

- **Obsługiwana walidacja**
  - Akceptuje tylko `deckId` z listy `DeckOptionVM` (wybór spoza listy jest niemożliwy, bo kontrolowany).
  - Nie wywołuje `onChange`, jeśli użytkownik wybierze placeholder (domyślnie placeholder nie jest wartością).

- **Typy**
  - `DeckOptionVM` jako opcja selecta.
  - Callback `(deckId: number) => void`.

- **Propsy (przykład)**
  - `value?: number` (zwykle `undefined`, bo fiszka jest nieprzypisana).
  - `options: DeckOptionVM[]`
  - `placeholder: string`
  - `disabled: boolean`
  - `error?: string`
  - `onChange: (deckId: number) => void`

### 5. Typy

#### Istniejące typy backendowe

- **`DeckDto`** (z `src/types.ts`)
  - Bazuje na `Deck` z bazy danych (`decks.Row`) bez `user_id`, plus:
  - Pola istotne dla widoku:
    - `id: number`
    - `name: string`
    - `created_at: string` (ISO)
    - `updated_at: string` (ISO)
    - `flashcard_count: number`

- **`FlashcardDto`** (z `src/types.ts`)
  - Bazuje na `Flashcard` (tabela `flashcards`) bez `user_id` i `generation_id`.
  - Pola wykorzystywane w tym widoku (zob. select w `listFlashcards`):
    - `id: number`
    - `deck_id: number | null`
    - `source: FlashcardSource` (`"ai_full" | "ai_edited" | "manual"`)
    - `front: string`
    - `back: string`
    - `space_repetition: SpaceRepetitionStatus` (`"OK" | "NOK" | "not_checked"`)
    - `last_repetition: string | null`
    - `created_at: string`
    - `updated_at: string`

- **`FlashcardUpdatedDto`**
  - Zawiera:
    - `id: number`
    - `deck_id: number | null`
  - Używane do potwierdzenia wyniku `PATCH /api/flashcards/:id`.

- **`ApiResponse<T>`**
  - Standardowa odpowiedź sukcesu:
    ```ts
    interface ApiResponse<T> {
      data: T;
    }
    ```

- **`ApiErrorResponse`**
  - Standardowa odpowiedź błędu:
    ```ts
    interface ApiErrorResponse {
      error: {
        message: string;
        code?: string;
      };
    }
    ```

#### Nowe typy ViewModel / frontendowe

- **`DeckOptionVM`**
  - Uproszczona reprezentacja decku do dropdownu:
  ```ts
  interface DeckOptionVM {
    id: number;
    name: string;
  }
  ```

- **`UnassignedFlashcardVM`**
  - Reprezentacja fiszki w widoku „Nieprzypisane”:
  ```ts
  interface UnassignedFlashcardVM {
    id: number;
    front: string;
    back: string;
    source: FlashcardSource;
    spaceRepetition: SpaceRepetitionStatus;
    lastRepetitionLabel: string | null; // np. "Brak powtórek" / "Ostatnia: 2025-11-10"
    createdAtLabel: string;             // sformatowana data utworzenia
    updatedAtLabel: string;             // sformatowana data aktualizacji
    isAssigning: boolean;               // czy trwa operacja PATCH dla tej fiszki
    assignError?: string;               // komunikat błędu dla tej fiszki
  }
  ```

- **`UnassignedDeckState`**
  - Stan widoku na poziomie strony:
  ```ts
  interface UnassignedDeckState {
    items: UnassignedFlashcardVM[];  // wszystkie pobrane fiszki nieprzypisane
    visibleCount: number;            // ilu elementom pozwalamy się wyświetlić (pseudo-paginacja)
    isInitialLoading: boolean;       // ładowanie pierwszego requestu
    isLoadingMore: boolean;          // ładowanie kolejnej „strony”
    loadError?: string;              // błąd ładowania listy fiszek
    assignGlobalError?: string;      // globalny błąd przypisywania (gdy nie jest specyficzny dla jednej fiszki)
  }
  ```

- **`AssignFlashcardPayload`** (do użytku w hooku mutacji)
  ```ts
  interface AssignFlashcardPayload {
    flashcardId: number;
    deckId: number;
  }
  ```

### 6. Zarządzanie stanem

- **Poziom strony (`UnassignedDeckPage`)**
  - Wykorzystanie `useReducer` (podobnie jak w `DashboardPage`) do zarządzania złożonym stanem (`UnassignedDeckState`).
  - Akcje reducera:
    - `SET_INITIAL_LOADING` (ustawienie flagi ładowania startowego),
    - `SET_ITEMS` (ustawienie listy `items` na podstawie wyników API),
    - `SET_VISIBLE_COUNT` (aktualizacja limitu widocznych elementów),
    - `SET_LOADING_MORE`, `SET_LOAD_ERROR`,
    - `START_ASSIGN` / `FINISH_ASSIGN` (ustawianie `isAssigning` i `assignError` w `UnassignedFlashcardVM`),
    - `REMOVE_ITEM` (usunięcie fiszki, która została przypisana do decku),
    - `SET_GLOBAL_ASSIGN_ERROR`.

- **Hook `useUnassignedFlashcards`**
  - Odpowiedzialny za:
    - wykonanie `GET /api/flashcards?unassigned=true&sort=created_asc` po montażu,
    - mapowanie `FlashcardDto[]` → `UnassignedFlashcardVM[]`,
    - zarządzanie `isInitialLoading`, `loadError`,
    - udostępnienie `refetch()` (ponowne załadowanie),
    - opcjonalnie logikę pseudo-paginacji:
      - `visibleItems = items.slice(0, visibleCount)`,
      - `hasMore = visibleCount < items.length`,
      - metoda `loadMore()` zwiększająca `visibleCount` o stały krok (np. 20).

- **Hook `useDeckOptions`**
  - Wywołuje `GET /api/decks?sort=name_asc`.
  - Mappuje `DeckDto[]` → `DeckOptionVM[]`.
  - Stan:
    - `options: DeckOptionVM[]`,
    - `isLoading: boolean`,
    - `error?: string`.

- **Hook `useAssignFlashcardToDeck`**
  - Przyjmuje callback do aktualizacji stanu (np. dispatcher z reducera).
  - Zapewnia funkcję `assign({ flashcardId, deckId })`:
    - ustawia `isAssigning = true` dla danego elementu,
    - wykonuje `PATCH /api/flashcards/:id` z body `{ deck_id: deckId }`,
    - po sukcesie:
      - usuwa element z listy (`REMOVE_ITEM`),
      - wyświetla toast o sukcesie,
    - po błędzie:
      - ustawia `assignError` w danym `UnassignedFlashcardVM`,
      - wyświetla toast o błędzie (`toast.error`),
      - resetuje `isAssigning`.

### 7. Integracja API

- **`GET /api/decks`**
  - Wywołanie:
    - URL: `/api/decks?sort=name_asc` (opcjonalne `sort`, domyślnie sort po `updated_desc`, ale dla dropdownu wygodniejsze jest sortowanie po nazwie).
    - Metoda: `GET`.
  - Sukces (200):
    - Odpowiedź: `ApiResponse<DeckDto[]>`.
    - Dane mapowane do `DeckOptionVM[]`.
  - Błędy:
    - `400 INVALID_INPUT` – błędny `sort` (w praktyce nie wystąpi, bo wartość jest stała),
    - `500 DATABASE_ERROR` / `INTERNAL_ERROR` – pokazanie inline błędu + toast, opcja „Spróbuj ponownie”.

- **`GET /api/flashcards` z filtrem `unassigned`**
  - Wywołanie:
    - URL: `/api/flashcards?unassigned=true&sort=created_asc`.
    - Metoda: `GET`.
  - Sukces (200):
    - Odpowiedź: `ApiResponse<FlashcardDto[]>`.
    - Filtrowanie po stronie backendu (`deck_id = null` już załatwia endpoint).
    - Mapowanie do `UnassignedFlashcardVM[]` (formatowanie dat, ustawienie flag na `false`).
  - Błędy:
    - `400 INVALID_INPUT` – np. gdyby `unassigned` ≠ `"true"` (nie wystąpi przy stałej wartości).
    - `404 DECK_NOT_FOUND` – nie dotyczy tego wariantu zapytania.
    - `500 DATABASE_ERROR` / `INTERNAL_ERROR` – globalny błąd ładowania listy fiszek.

- **`PATCH /api/flashcards/:id`**
  - Wywołanie:
    - URL: `/api/flashcards/${flashcardId}` (ścieżka zaplanowana w API-plan, implementacja endpointu jest w osobnym pliku, ale typy są znane).
    - Metoda: `PATCH`.
    - Body (JSON):
      ```json
      { "deck_id": 4 }
      ```
      czyli `UpdateFlashcardCommand` z jednym polem.
  - Sukces (200):
    - Odpowiedź: `ApiResponse<FlashcardUpdatedDto>` (np. `{ "data": { "id": 2, "deck_id": 4 } }`).
    - Frontend:
      - usuwa fiszkę z widoku „Nieprzypisane” (bo nie jest już nieprzypisana),
      - pokazuje toast o sukcesie.
  - Błędy:
    - `400 INVALID_INPUT` – np. nieprawidłowy typ `deck_id` (zabezpieczone po stronie frontu).
    - `404 FLASHCARD_NOT_FOUND` – fiszka została usunięta lub nie należy do użytkownika:
      - usuwać ją z listy lokalnie i pokazywać komunikat o tym, że nie jest już dostępna.
    - `404 DECK_NOT_FOUND` – deck nie istnieje lub nie należy do użytkownika:
      - nie usuwać fiszki z listy,
      - pokazać inline error + toast, ewentualnie odświeżyć listę decków.
    - `500 DATABASE_ERROR` / `INTERNAL_ERROR` – pokazać toast + inline komunikat przy danej fiszce.

### 8. Interakcje użytkownika

- **Wejście na stronę `/decks/unassigned`**
  - Widok pokazuje nagłówek i stan ładowania (skeletony lub spinner).
  - Paralelnie:
    - `useDeckOptions` pobiera listę decków,
    - `useUnassignedFlashcards` pobiera nieprzypisane fiszki.
  - Po sukcesie:
    - użytkownik widzi liczbę fiszek oraz listę pierwszych N (np. 20).

- **Przeglądanie listy**
  - Użytkownik scrolluje listę; przycisk „Załaduj więcej” pozwala dograć kolejne N elementów.
  - Po kliknięciu przycisku:
    - blokuje się on (stan `isLoadingMore`),
    - po zakończeniu `visibleCount` rośnie i wyświetlane są kolejne elementy.

- **Przypisanie fiszki do decku**
  - Użytkownik wybiera deck z dropdownu w `UnassignedFlashcardItem`:
    - komponent sprawdza, czy jest co najmniej jeden deck,
    - wywołuje `onAssign(flashcardId, deckId)`.
  - W tle:
    - `useAssignFlashcardToDeck` wykonuje `PATCH`,
    - w czasie operacji dropdown jest disabled i pokazuje stan „Zapisywanie...”,
    - po sukcesie:
      - fiszka znika z listy,
      - użytkownik otrzymuje toast „Fiszka przypisana do decku X”.
    - po błędzie:
      - fiszka pozostaje na liście,
      - dropdown wraca do poprzedniego stanu,
      - wyświetlany jest inline błąd oraz toast.

- **Brak decków**
  - Jeżeli `DeckOptionVM[]` jest puste:
    - widok wyświetla informację: „Nie masz jeszcze żadnych decków. Utwórz deck w Dashboardzie, aby przypisać fiszki.”
    - dropdowny są disabled z odpowiednim placeholderem.
    - dodatkowy przycisk „Przejdź do Dashboardu” na górze widoku (redirect na `/` lub `/dashboard`, w zależności od aktualnego routingu).

- **Brak nieprzypisanych fiszek**
  - Jeżeli `items.length === 0` po załadowaniu:
    - widok pokazuje `UnassignedEmptyState` (np. komunikat „Nie masz żadnych nieprzypisanych fiszek” + link do dashboardu `/`).

- **Mapowanie historii użytkownika US-010 (Edycja fiszki)**
  - US-010 wymaga możliwości edycji treści fiszki.
  - W tym widoku edytowany jest tylko kontekst przypisania (pole `deck_id`), ale:
    - używamy tego samego mechanizmu `PATCH /api/flashcards/:id`, który w przyszłości może zostać rozszerzony o edycję `front` / `back` z tego widoku,
    - plan powinien przewidzieć opcjonalny przycisk „Edytuj” na `UnassignedFlashcardItem`, który w przyszłości otworzy dedykowany widok edycji (poza zakresem MVP tego widoku).

### 9. Warunki i walidacja

- **Warunki wymagane przez API:**
  - `GET /api/flashcards`:
    - `unassigned` musi być łańcuchem `"true"` – wartości hard-coded w kodzie (brak inputu od użytkownika).
  - `PATCH /api/flashcards/:id`:
    - Body musi być poprawnym JSONem,
    - zawsze przekazujemy poprawny `deck_id: number` z listy decków użytkownika (frontend nie pozwala wprowadzić innych wartości).

- **Walidacja na poziomie komponentów:**
  - `DeckAssignDropdown`:
    - nie pozwala na wysłanie wartości `undefined` / placeholderowej – `onChange` otrzymuje wyłącznie poprawne `deckId: number`,
    - przy braku decków: `disabled = true`, wyraźny komunikat o konieczności utworzenia decku.
  - `UnassignedDeckPage`:
    - nie wywołuje `assign`, gdy `deckOptions.length === 0`,
    - przy błędzie ładowania danych:
      - chowa listę,
      - pokazuje błąd z przyciskiem „Spróbuj ponownie”.
  - `UnassignedFlashcardList`:
    - nie wyświetla przycisku „Załaduj więcej”, gdy `hasMore === false`.

- **Wpływ walidacji na stan interfejsu:**
  - Błędy walidacji lokalnej (brak decku) nie generują requestów do API, a jedynie komunikaty UI.
  - Błędy z API są mapowane na:
    - `loadError` (błąd pobrania),
    - `assignError` w danej fiszce (błąd przypisania),
    - globalny `assignGlobalError`, jeśli dotyczy większej liczby operacji.

### 10. Obsługa błędów

- **Błędy pobierania decków (`GET /api/decks`)**
  - Wyświetlenie bannera błędu na górze widoku (np. czerwony box z treścią z `error.message`).
  - Nie renderowanie dropdownów lub ich wyłączenie z komunikatem „Nie udało się załadować listy decków”.
  - Przycisk „Spróbuj ponownie”, który ponownie wywołuje hook `useDeckOptions`.

- **Błędy pobierania fiszek (`GET /api/flashcards?unassigned=true`)**
  - Zastąpienie listy komponentem `UnassignedErrorState`:
    - Nagłówek „Nie udało się pobrać fiszek”,
    - Treść z `error.message`,
    - Przycisk „Odśwież” lub „Spróbuj ponownie”.

- **Błędy przypisywania (`PATCH /api/flashcards/:id`)**
  - `404 FLASHCARD_NOT_FOUND`:
    - usunięcie fiszki z listy (lokalnie),
    - toast informujący, że fiszka została usunięta lub nie należy do użytkownika.
  - `404 DECK_NOT_FOUND`:
    - nieusuwanie fiszki,
    - ustawienie `assignError` w ViewModelu,
    - toast z komunikatem z API,
    - ewentualne odświeżenie listy decków.
  - `500 DATABASE_ERROR` / `INTERNAL_ERROR`:
    - inline error przy fiszce,
    - toast z informacją „Nie udało się przypisać fiszki. Spróbuj ponownie później.”
  - Błędy sieciowe (brak połączenia):
    - podobne traktowanie jak `INTERNAL_ERROR`, komunikat o problemie z połączeniem.

- **Edge cases**
  - Użytkownik zmienia szybko deck kilka razy:
    - w czasie trwania requestu dropdown jest disabled, kolejne zmiany są blokowane do czasu odpowiedzi, jeśli uda się przepisać deck, to blokowanie aż do usunięcia elementu z listy.
  - Po przypisaniu ostatniej fiszki:
    - widok przechodzi do pustego stanu (komunikat + link do decków).

### 11. Kroki implementacji

1. **Przygotowanie routingu**
   - Utworzenie pliku `src/pages/decks/unassigned.astro`.
   - Osadzenie w nim komponentu `UnassignedDeckPage` jako Reactowej wyspy.
   - Ustawienie tytułu strony i podstawowych metadanych.

2. **Utworzenie komponentu `UnassignedDeckPage`**
   - Utworzenie pliku `src/components/unassigned/UnassignedDeckPage.tsx`.
   - Implementacja podstawowego szkieletu: `Toaster`, `<main>`, nagłówek, miejsce na listę.
   - Podłączenie hooków `useUnassignedFlashcards` oraz `useDeckOptions` (na razie „na twardo” z mockowym zwracaniem danych lub samym stanem ładowania).

3. **Implementacja hooka `useDeckOptions`**
   - Utworzenie katalogu `src/components/unassigned/hooks/`.
   - Implementacja wywołania `GET /api/decks?sort=name_asc`.
   - Mapowanie odpowiedzi na `DeckOptionVM[]`.
   - Zapewnienie pól `options`, `isLoading`, `error`, `refetch`.

4. **Implementacja hooka `useUnassignedFlashcards`**
   - Wywołanie `GET /api/flashcards?unassigned=true&sort=created_asc`.
   - Mapowanie `FlashcardDto[]` na `UnassignedFlashcardVM[]` (formatowanie dat, inicjalizacja flag).
   - Implementacja pseudo-paginacji (`visibleCount`, `hasMore`, `loadMore`).
   - Udostępnienie funkcji `refetch` i obsługi błędów.

5. **Dodanie reducera i stanu w `UnassignedDeckPage`**
   - Definicja typu `UnassignedDeckState` i akcji.
   - Podpięcie reducera (`useReducer`), integracja z wynikami hooków:
     - `useEffect` dla aktualizacji `items` po sukcesie pobrania,
     - `useEffect` dla sterowania flagami ładowania.

6. **Implementacja komponentu `UnassignedFlashcardList`**
   - Utworzenie pliku `src/components/unassigned/UnassignedFlashcardList.tsx`.
   - Implementacja renderowania listy, stanu pustego, skeletonów oraz przycisku „Załaduj więcej”.
   - Podłączenie callbacków `onLoadMore` i `onAssign`.

7. **Implementacja komponentu `UnassignedFlashcardItem`**
   - Utworzenie pliku `src/components/unassigned/UnassignedFlashcardItem.tsx`.
   - Zaimplementowanie layoutu karty (front/back, źródło, status, daty).
   - Włączenie `DeckAssignDropdown` i obsługi `isAssigning`/`error`.
   - Zastosowanie `whitespace-pre-wrap` i brak interpretacji HTML w treściach.

8. **Implementacja komponentu `DeckAssignDropdown`**
   - Utworzenie pliku `src/components/unassigned/DeckAssignDropdown.tsx` (lub bardziej ogólnej lokalizacji, jeśli planujemy re-użycie).
   - Implementacja na bazie komponentów shadcn/ui (`Select`).
   - Podłączenie obsługi błędów i stanu `disabled`.

9. **Implementacja hooka `useAssignFlashcardToDeck`**
   - Utworzenie pliku `src/components/unassigned/hooks/useAssignFlashcardToDeck.ts`.
   - Implementacja logiki `PATCH /api/flashcards/:id` z odpowiednią obsługą błędów i aktualizacji stanu (dispatcher przekazywany z `UnassignedDeckPage`).
   - Integracja z toastami (`toast.success`, `toast.error`).

10. **Dodanie stanów błędów i pustych w `UnassignedDeckPage`**
    - Implementacja `UnassignedEmptyState` i `UnassignedErrorState` jako wewnętrznych sekcji komponentu.
    - Wyświetlanie odpowiednich komunikatów w zależności od `items.length`, `loadError` i błędu z `useDeckOptions`.

11. **Spójność nawigacji i testy manualne**
    - Upewnienie się, że przycisk „Nieprzypisane” w `DashboardPage` (`handleOpenUnassigned`) poprawnie prowadzi do `/decks/unassigned`.
    - Ręczne przetestowanie scenariuszy:
      - brak decków,
      - brak nieprzypisanych fiszek,
      - poprawne przypisanie,
      - błędy (network / 404 / 500),
      - długie listy (działanie „Załaduj więcej”).
    Ten punkt przeprowadza użytkownik, model po zakończeniu działania powinien o nim jedynie wspomnieć.

