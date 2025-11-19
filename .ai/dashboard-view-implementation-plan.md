# Plan implementacji widoku Dashboard

## 1. Przegląd
Dashboard to startowy widok aplikacji, który agreguje listę decków użytkownika, pokazuje deck „Nieprzypisane” z licznikiem dla fiszek pozbawionych przypisania oraz udostępnia bezpośrednie akcje wejścia w naukę i zarządzania deckami. Widok ma obsługiwać stany ładowania, brak decków oraz brak fiszek, a także eksponować kluczowe CTA zachęcające do tworzenia decków (jeśli nie ma decków) i uruchamiania generacji AI (jeśli nie ma stworzonych fiszek) zgodnie z wymaganiami PRD i historii użytkownika.

## 2. Routing widoku
Widok jest dostępny pod ścieżką `/` i powinien być zaimplementowany jako główna strona w `src/pages/index.astro`, z osadzeniem interaktywnego komponentu React (np. `DashboardPage`) renderowanego po stronie klienta dla logiki stanu i interakcji z API.

## 3. Struktura komponentów
Hierarchia obejmuje nadrzędny `DashboardPage`, który ładuje dane i zarządza stanem globalnym. Wewnątrz renderowany jest nagłówek z akcjami (`HeaderActions`), sekcja kafla „Nieprzypisane” (`VirtualDeckCard`), kontener listy (`DeckListSection`) z `SkeletonList`, empty state lub szeregiem `DeckCard`. Dialogi (`CreateDeckDialog`, `UpdateDeckDialog`, `DeleteDeckConfirmDialog`) są montowane na końcu drzewa. `CTAEmptyState`, `ToastProvider` i `InlineError` zapewniają odpowiednio CTA, powiadomienia i komunikaty walidacyjne.

## 4. Szczegóły komponentów

### DashboardPage
Opis: kontener React odpowiedzialny za pobieranie danych, synchronizację dialogów i przekazywanie handlerów. Główne elementy to nagłówek z przyciskami, sekcja liczników oraz lista kart. Interakcje obejmują zmianę sortowania, otwieranie dialogów, delegowanie akcji create/update/delete i odświeżanie danych po mutacjach. Walidacja polega na blokowaniu submitu formularzy do momentu poprawnego wypełnienia i weryfikacji unikalności po stronie API. Typy: używa `DeckCardViewModel`, `DashboardState`, `DeckListResponse`, `UnassignedSummaryDto`. Propsy: brak (renderowany bezpośrednio w stronicy), może opcjonalnie przyjmować flagę testową.

### DeckListSection
Opis: sekcja prezentująca listę decków wraz ze skeletonem i empty-state. Elementy obejmują nagłówek sekcji, przełącznik sortowania i siatkę kart. Interakcje: zmiana sortu (wywołuje refetch), przewijanie/klaśnięcie w CTA empty state. Walidacja: upewnienie się, że sort param pochodzi z zestawu `DeckSortOption`. Typy: `DeckCardViewModel[]`, `DeckSortOption`. Propsy: `decks`, `isLoading`, `sort`, `onSortChange`, `onOpenDeck`, `onLearnDeck`, `onEditDeck`, `onDeleteDeck`.

### DeckCard
Opis: pojedyncza karta decku z nazwą, licznikiem, timestampem i akcjami (Otwórz, Ucz się, menu kontekstowe Edytuj/Usuń). Elementy: kafel Shadcn Card, button CTA, dropdown menu. Interakcje: kliknięcie nazwy/„Otwórz” nawigujące do `/decks/:id`, przycisk „Ucz się” kierujący do `/decks/:id/learn`, przyciski edycji i usunięcia otwierające dialogi. Walidacja: brak własnej walidacji, ale powinna blokować akcje, gdy deck w trakcie mutacji (np. disable). Typy: `DeckCardViewModel`. Propsy: `deck`, `onOpen`, `onLearn`, `onEdit`, `onDelete`.

### VirtualDeckCard
Opis: specjalny kafel reprezentujący fiszki bez decku. Elementy: karta z etykietą „Nieprzypisane”, licznik i CTA prowadzące do widoku listy nieprzypisanych (np. `/decks/unsassigned`). Interakcje: kliknięcie przekierowuje do dedykowanego filtra, brak menu kontekstowego. Walidacja: renderuje się tylko, gdy `unassignedCount > 0`. Typy: `VirtualDeckSummary` (count i link). Propsy: `count`, `onOpen`.

### CreateDeckDialog
Opis: modal Shadcn dialog z formularzem tworzenia decku. Elementy: input tekstowy, komunikaty InlineError, przyciski „Anuluj” i „Zapisz”. Interakcje: submit formularza wywołuje POST, zamknięcie resetuje stan. Walidacja: długość 1–30 znaków, trimming spacji, brak duplikatów (obsługa kodu 409). Typy: `DeckFormValues`, `CreateDeckCommand`. Propsy: `open`, `onClose`, `onSubmit`, `isSubmitting`, `apiError`.

### UpdateDeckDialog
Opis: ponowne użycie formularza dla edycji nazwy istniejącego decku. Elementy identyczne jak w `CreateDeckDialog`, z prefill nazwy. Interakcje: submit wykonuje PATCH. Walidacja: identyczna (1–30 znaków, unikalność). Typy: `DeckFormValues`, `UpdateDeckCommand`, referencja do `DeckCardViewModel`. Propsy: `open`, `deck`, `onClose`, `onSubmit`, `isSubmitting`, `apiError`.

### DeleteDeckConfirmDialog
Opis: modal potwierdzający usunięcie decku z ostrzeżeniem o utracie fiszek. Elementy: tekst ostrzegawczy, opcjonalny input potwierdzenia, przyciski „Anuluj” i destrukcyjny „Usuń”. Interakcje: kliknięcie „Usuń” wykonuje DELETE; dialog pokazuje spinner w trakcie operacji. Walidacja: jeśli wprowadzany jest tekst potwierdzający, musi się zgadzać (np. nazwa decku). Typy: `DeckCardViewModel`. Propsy: `open`, `deck`, `onClose`, `onConfirm`, `isSubmitting`, `apiError`.

### CTAEmptyState
Opis: sekcja zastępcza wyświetlana, gdy brak decków lub brak fiszek. Elementy: ilustracja/ikonka, tytuł, opis i odpowiedni przycisk CTA. Interakcje: główne CTA w scenariuszu „brak decków” otwiera `CreateDeckDialog`; scenariusz „brak fiszek” kieruje do procesu generacji AI. Walidacja: logika wyboru copy w zależności od danych wejściowych. Typy: prosta struktura `EmptyStateVariant`. Propsy: `variant`, `onPrimaryAction`.

### ToastProvider i InlineError
Opis: globalny provider Shadcn toast i komponent do pokazywania błędów formularza pod polem. Elementy: kontener portalu i tekst błędu. Interakcje: toasty pojawiają się po sukcesach i błędach, InlineError odczytuje `formState.errors`. Walidacja: brak dodatkowej logiki poza przekazywaniem komunikatów. Typy: `ToastMessage`, `InlineErrorProps`. Propsy: standardowe.

### SkeletonList
Opis: lista placeholderów używana przed zakończeniem pobierania. Elementy: powtarzalne kostki skeleton. Interakcje: brak. Walidacja: renderowana tylko podczas `isLoading`. Typy: `SkeletonListProps` z liczbą elementów.

## 5. Typy
`DeckDto` pochodzi z definicji backendu i zawiera `id`, `name`, `created_at`, `updated_at`, `flashcard_count`. `DeckListResponse` opakowuje `DeckDto[]` w `ApiResponse`. `UnassignedSummaryDto` reprezentuje odpowiedź z `GET /api/flashcards?unassigned=true` i zawiera pole `unassigned_total: number`. `DeckCardViewModel` rozszerza `DeckDto` o pola pochodne (`updatedLabel: string`, `isMutating: boolean`, opcjonalnie `sourceIcons?: FlashcardSource[]`). `VirtualDeckSummary` to `{ count: number; link: string }`. `DashboardState` grupuje `decks`, `isLoading`, `sort`, `unassignedCount`, `dialogState`, `toast`. `DeckFormValues` zawiera `name: string`. `DeckMutationError` przechowuje `code?: string` oraz `message` wykorzystywane przez formularze. `DeckSortOption` definiuje dozwolone wartości sortowań wymienione w API.

## 6. Zarządzanie stanem
`DashboardPage` utrzymuje główne zmienne w `useReducer`: status ładowania listy, sort, dane decków, licznik unassigned, definicję otwartego dialogu i wynik bieżącej mutacji. Dodatkowy `useState` przechowuje wartości formularza nazwy (kontrolowany input). Warto przygotować hook `useDecksData(sort)` agregujący równoległe wywołania GET decków i GET unassigned, zwracający `DeckCardViewModel[]`, `unassignedCount`, `isLoading`, `refetch`. Mutacje `useDeckMutations` kapsułkują POST/PATCH/DELETE i dostarczają metody `createDeck`, `updateDeck`, `deleteDeck` zwracające promisy z obsługą kodów błędów, co upraszcza dialogi. Toasty i InlineError korzystają z lokalnego stanu w hooku lub z `useToast`.

## 7. Integracja API
GET `/api/decks?sort=<DeckSortOption>` służy do pobrania listy decków; odpowiedź mapowana na `DeckCardViewModel[]`. GET `/api/flashcards?unassigned=true` zwraca `ApiResponse<{ unassigned_total: number }>` dostarczające licznik kafla wirtualnego. POST `/api/decks` przyjmuje `CreateDeckCommand` i po zwrocie `{ data: { id } }` powoduje refetch listy oraz toast sukcesu. PATCH `/api/decks/:id` wysyła `UpdateDeckCommand`, uaktualnia lokalny element lub refetchuje listę. DELETE `/api/decks/:id` nie zwraca ciała; po sukcesie refetch i toast potwierdzający. Wszystkie wywołania wymagają obsługi kodów 400, 401, 404, 409 oraz błędów sieciowych.

## 8. Interakcje użytkownika
Kliknięcie „Stwórz nowy deck” otwiera dialog; wysłanie formularza przy poprawnych danych tworzy deck i zamyka modal. Ikona menu w `DeckCard` umożliwia wybór edycji lub usunięcia; edycja otwiera dialog z prefill nazwy, a submit aktualizuje kartę. Akcja usuń otwiera dialog potwierdzenia i po akceptacji usuwa deck oraz wszystkie fiszki (zgodnie z US-006). Przycisk „Ucz się” przenosi użytkownika do `/decks/:id/learn`. Kliknięcie „Otwórz” wchodzi do widoku szczegółowego decku. Kafel „Nieprzypisane” przenosi do listy nieprzypisanych fiszek. Empty state CTA przy braku decków wyświetla dialog, a przy braku fiszek – wywołuje flow generacji AI.

## 9. Warunki i walidacja
Formularze nazwy decku muszą wymuszać ciąg znaków długości 1–30, po trimie. Pola nie mogą akceptować wartości identycznych jak istniejący deck; konflikt obsługiwany jest na podstawie kodu 409 i komunikatu „Taki deck już istnieje”. Sortowanie ogranicza się do wartości enumeracji i powinno być walidowane po stronie UI zanim doda się param do URL-a. Kafel „Nieprzypisane” renderuje się tylko, gdy licznik większy od zera. CTA empty states wybierają wariant logiczny bazując na liczbie decków i sumarycznej liczbie fiszek (`sum(deck.flashcard_count)`). Przycisk „Ucz się” powinien być dezaktywowany dla decków z zerowym `flashcard_count`.

## 10. Obsługa błędów
Błędy walidacji (400, 409) są mapowane na InlineError wewnątrz dialogów; użytkownik widzi dokładny komunikat. Błędy 401 skutkują przekierowaniem do logowania lub globalnym toastem. Błędy 404 przy edycji/usuwaniu muszą informować, że deck przestał istnieć i wymuszają refetch. Błędy 500 i problemy sieciowe zgłaszane są tostem „Spróbuj ponownie”. Dla DELETE należy zabezpieczyć się przed usunięciem decku w trakcie innej mutacji poprzez blokadę przycisków.

## 11. Kroki implementacji
1. Utwórz stronę `src/pages/index.astro` (jeśli brak) i zaimportuj kontener React dla dashboardu.
2. Zaimplementuj `DashboardPage` z bazowym szkieletem UI oraz providerem toastów.
3. Przygotuj hook `useDecksData` realizujący równoległe zapytania GET i zwracający dane, stan ładowania oraz metodę refetch.
4. Dodaj `DeckListSection` wraz z komponentami `SkeletonList` i `CTAEmptyState`, obsługując wszystkie stany (loading, brak decków, brak fiszek).
5. Zaimplementuj `DeckCard` i `VirtualDeckCard`, podpinając akcje nawigacji i menu kontekstowego.
6. Dodaj `CreateDeckDialog` z walidacją 1–30 znaków i logiką POST; wyświetlaj InlineError przy 409.
7. Zaimplementuj `UpdateDeckDialog` korzystający z tego samego formularza, wykorzystujący PATCH oraz odświeżenie listy.
8. Dodaj `DeleteDeckConfirmDialog` z ostrzeżeniem i obsługą DELETE, blokując przyciski podczas requestu.
9. Skonfiguruj `useDeckMutations` (lub równoważne funkcje) zwracające promisy i konwertujące błędy na przyjazne komunikaty.
10. Podłącz toasty sukcesu/błędu do każdej mutacji, zapewnij, że dialogi zamykają się i stan formularza jest resetowany.