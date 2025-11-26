## Plan implementacji widoku Tryb nauki (`/learn/:deckId`)

### 1. Przegląd

- **Cel widoku**: Umożliwienie użytkownikowi przeprowadzenia sesji nauki dla wybranego decku z wykorzystaniem prostego algorytmu spaced repetition. Użytkownik przegląda fiszki, odsłania odpowiedzi, ocenia swoją znajomość ("Wiedziałem"/"Nie wiedziałem"), a system zapisuje ocenę i wyświetla kolejną fiszkę.
- **Zakres funkcjonalny**:
  - **Start sesji** z poziomu wybranego decku (US-012).
  - **Prezentacja fiszek**: najpierw przód, po interakcji tył.
  - **Ocena** każdej fiszki w modelu OK/NOK (US-013) z buforowaniem i batchowym zapisem do API.
  - **Pasek postępu i licznik sesji** (ile kart z obecnej partii, ile due według algorytmu, ile już ocenionych).
  - **Ekran podsumowania** po zakończeniu partii z opcją kontynuacji (nowe pobranie fiszek) lub powrotu do widoku decku.
- **Powiązanie z backendem**:
  - Pobieranie fiszek do nauki: **GET `/api/learn/:deckId?limit=...`** zwracające `LearnResponseDto` (lista `FlashcardLearnDto` + `meta` z `total_due`, `returned`, `deck_total`).
  - Zapis ocen: **PATCH `/api/learn/review`** z payloadem `ReviewFlashcardsCommand { review: ReviewFlashcardItemCommand[] }`.
- **Decyzje UX/A11Y z planu UI**:
  - Nawigacja główna (`AppShell`) pozostaje widoczna.
  - Odświeżenie strony resetuje sesję (stan tylko lokalny).
  - Tylko plain text dla treści fiszek, bez HTML/Markdown, z `white-space: pre-wrap`.

### 2. Routing widoku

- **Ścieżka URL**: `/learn/:deckId`.
- **Plik routingu Astro**: `src/pages/learn/[deckId].astro`.
- **Zachowanie routingu**:
  - `:deckId` jest wymaganym parametrem liczbowym (pozytywny integer, zgodnie z `deckIdParamSchema`).
  - Brak `deckId` lub nieprawidłowy format nie jest obsługiwany w tym widoku – taki przypadek powinien być zablokowany nawarstwowo przez inne widoki (np. przyciski „Ucz się” generują poprawny URL).
- **Integracja z AppShell**:
  - `AppShell` (nagłówek z nawigacją) jest używany tak jak w pozostałych widokach (np. przez wspólny layout Astro).
  - Wewnątrz layoutu renderowana jest Reactowa wyspa `LearnPage`/`LearnView`.

### 3. Struktura komponentów

- **Warstwa strony (Astro)**:
  - `LearnPageRoute` (`src/pages/learn/[deckId].astro`):
    - Odczytuje `deckId` z parametrów trasy i przekazuje go jako prop do Reactowego komponentu.
    - Osadza Reactową wyspę w layoucie z globalną nawigacją.
- **Główna wyspa React**:
  - `LearnPage` (kontener widoku trybu nauki):
    - Odpowiada za logikę sesji nauki, zarządzanie stanem i komunikację z API (przez custom hook).
    - Renderuje odpowiednie pod-komponenty w zależności od fazy (`loading`, `learning`, `summary`, `empty`, `error`).
- **Komponenty widoku nauki**:
  - `StudyCard`:
    - Prezentuje aktualną fiszkę (przód/tył), zarządza przełączaniem widoku odpowiedzi.
  - `ReviewControls`:
    - Zestaw przycisków i akcji służących do oceny fiszki: „Nie wiedziałem” (NOK), „Wiedziałem” (OK).
  - `ProgressBar`:
    - Pasek postępu sesji (np. ocena X/Y kart z bieżącej partii).
  - `SessionCounter`:
    - Informacje licznikowe: numer aktualnej karty, liczba kart w sesji, liczba due (`meta.total_due`), liczba wszystkich w decku (`meta.deck_total`).
  - `SummaryScreen`:
    - Ekran podsumowania po zakończeniu sesji: ilość kart ocenionych, ile OK/NOK, oraz CTA: „Kontynuuj” (nowa partia) i „Powrót do decku”.
- **Hooki i warstwa logiki**:
  - `useLearnSession(deckId: number)`:
    - Zarządza cyklem sesji: pobieranie kart, stanem aktualnej fiszki, buforem ocen, statystykami i ekranem podsumowania.
  - (Opcjonalnie) `useReviewBuffer(options)`:
    - Wydzielony hook do zarządzania buforem ocen i batchowym wysyłaniem do `PATCH /api/learn/review`.

### 4. Szczegóły komponentów

#### 4.1. `LearnPage`

- **Opis**: Główny komponent widoku nauki. Łączy wszystkie części UI, inicjuje pobranie fiszek z API, obsługuje interakcje użytkownika (odsłanianie odpowiedzi, ocena, przechodzenie między kartami) i kontroluje fazy widoku (ładowanie, nauka, podsumowanie, brak danych, błąd).
- **Główne elementy**:
  - Wrapper layoutu dla treści nauki (sekcja z kartą, paskiem postępu i licznikami).
  - Warunkowo:
    - Skeleton lub stan ładowania.
    - Główny widok nauki: `ProgressBar`, `SessionCounter`, `StudyCard`, `ReviewControls`.
    - `SummaryScreen` po zakończeniu sesji bądź jeśli API zwróci pustą listę.
    - Komunikat błędu (InlineError / ErrorState).
- **Obsługiwane interakcje**:
  - Start sesji (na mount, automatyczne wywołanie `GET /api/learn/:deckId`).
  - Przejście do kolejnej partii (ponowne `GET /api/learn/:deckId` po kliknięciu „Kontynuuj” na `SummaryScreen`).
  - Przejście do widoku szczegółów decku (np. link `/decks/:deckId`).
- **Obsługiwana walidacja**:
  - Walidacja `deckId` w warstwie typów (prop `deckId` jako `number`, rzutowanie i wczesne zakończenie w przypadku braku/NaN).
  - Brak możliwości oceny fiszki, gdy odpowiedź nie została odsłonięta (blokowanie/przycisk disabled).
  - Brak możliwości wysłania więcej odpowiedzi niż liczba fiszek w sesji, brak duplikacji w buforze (każda fiszka oceniana co najwyżej raz w danej partii).
- **Typy**:
  - DTO z backendu:
    - `LearnResponseDto` (dane `FlashcardLearnDto[]` + `LearnMetaDto`).
  - ViewModel:
    - `LearnFlashcardViewModel` (opisany w sekcji 5).
    - `LearnSessionMetaViewModel`, `LearnPhase`, `LearnSessionStats` (sekcja 5).
- **Propsy**:
  - `deckId: number` – przekazany z trasy Astro.

#### 4.2. `StudyCard`

- **Opis**: Prezentuje pojedynczą fiszkę w trybie nauki. Pokazuje najpierw przód; po akcji użytkownika odsłania tył. Odpowiada również za wizualne zaznaczenie, że karta została oceniona (np. krótkie podkreślenie/animacja, jeśli wymagane).
- **Główne elementy**:
  - Kontener karty (np. panel `Card` z shadcn/ui).
  - Sekcja frontu:
    - Tekst frontu, renderowany jako plain text, z `white-space: pre-wrap`.
  - Sekcja tyłu:
    - Tekst tyłu, również jako plain text z `white-space: pre-wrap`.
  - Przycisk „Pokaż odpowiedź” lub kliknięcie w kartę (ale preferowany wyraźny przycisk z punktu widzenia A11Y).
- **Obsługiwane interakcje**:
  - Kliknięcie „Pokaż odpowiedź” → zmiana lokalnego stanu `isBackVisible` na `true` i wyemitowanie zdarzenia do rodzica.
- **Obsługiwana walidacja**:
  - Brak treści HTML – komponent wymusza renderowanie zwykłego tekstu.
  - Ochrona przed wywołaniem `onReveal` wielokrotnie (np. jeśli `isBackVisible` jest już true, handler nic nie robi).
- **Typy**:
  - `LearnFlashcardViewModel` (przynajmniej: `id`, `front`, `back`).
- **Propsy**:
  - `card: LearnFlashcardViewModel | null` – aktualna karta; `null` gdy trwa ładowanie lub brak fiszki.
  - `isBackVisible: boolean` – stan odpowiedzi (przekazywany z rodzica, `StudyCard` nie musi przechowywać go własnoręcznie, może być kontrolowany).
  - `onReveal: () => void` – callback wywoływany przy odsłonięciu odpowiedzi.

#### 4.3. `ReviewControls`

- **Opis**: Komponent odpowiedzialny za ocenę fiszki po odsłonięciu odpowiedzi, zgodnie z user story US-013. Udostępnia dwa przyciski: „Nie wiedziałem” (NOK) i „Wiedziałem” (OK).
- **Główne elementy**:
  - Dwukolumnowy układ przycisków lub przyciski obok siebie:
    - Button NOK (np. wariant `destructive`).
    - Button OK (np. wariant `success`/`primary`).
- **Obsługiwane interakcje**:
  - Kliknięcie przycisku NOK → wywołanie `onAnswer('NOK')`.
  - Kliknięcie przycisku OK → wywołanie `onAnswer('OK')`.
- **Obsługiwana walidacja**:
  - Komponent jest **aktywny** tylko, gdy:
    - `isBackVisible === true`.
    - Trwa faza `learning` (nie `loading`, nie `summary`).
  - W przypadku braku odsłoniętej odpowiedzi przyciski są `disabled`.
- **Typy**:
  - Własny alias:
    - `type ReviewResponse = 'OK' | 'NOK';`
  - ViewModel:
    - Korzysta pośrednio ze `LearnSessionStats` przy aktualizacji stanu w rodzicu.
- **Propsy**:
  - `disabled: boolean` – globalne wyłączenie komponentu (np. podczas flushowania bufora lub przejścia do następnej karty).
  - `onAnswer: (response: ReviewResponse) => void` – callback do obsługi wyboru użytkownika.
  - `isBackVisible: boolean` – informacja, czy odpowiedź została odsłonięta (używana do ustawienia `disabled`).

#### 4.4. `ProgressBar`

- **Opis**: Wizualizuje postęp użytkownika w bieżącej sesji (partii kart pobranej z API). Nie miesza logiki – otrzymuje tylko liczby i przelicza procent.
- **Główne elementy**:
  - Wskaźnik postępu (np. `Progress` z shadcn/ui).
  - Etykieta tekstowa, np. „X/Y kart w tej sesji”.
- **Obsługiwane interakcje**:
  - Brak interakcji (komponent wyłącznie prezentacyjny).
- **Obsługiwana walidacja**:
  - Walidacja wejścia: jeśli `total <= 0`, pasek powinien być pusty (0%), unikamy dzielenia przez zero.
- **Typy**:
  - `ProgressBarProps`:
    - `current: number;`
    - `total: number;`
- **Propsy**:
  - `current: number` – liczba kart już ocenionych.
  - `total: number` – łączna liczba kart w obecnej partii (`meta.returned` lub długość tablicy kart).

#### 4.5. `SessionCounter`

- **Opis**: Pokazuje metryki sesji: numer aktualnej karty, liczbę kart w sesji, liczbę due (`meta.total_due`), łączną liczbę kart w decku (`meta.deck_total`) oraz zliczenia OK/NOK.
- **Główne elementy**:
  - Teksty typu:
    - „Karta N z M”.
    - „Do powtórki: total_due”.
    - „W decku: deck_total”.
    - „Wiedziałem: X, Nie wiedziałem: Y”.
- **Obsługiwane interakcje**:
  - Brak – komponent tylko odczytuje propsy.
- **Obsługiwana walidacja**:
  - Dba o poprawne formatowanie (np. brak ujemnych wartości; clampowanie do minimum 0).
- **Typy**:
  - `LearnSessionStats` (z sekcji 5).
  - `LearnSessionMetaViewModel`.
- **Propsy**:
  - `currentIndex: number` – indeks aktualnej karty (0-based) lub 1-based, w zależności od przyjętej konwencji, ale lepiej przekazać już przeliczone `currentNumber`.
  - `totalInSession: number`.
  - `meta: LearnSessionMetaViewModel`.
  - `stats: LearnSessionStats`.

#### 4.6. `SummaryScreen`

- **Opis**: Ekran końcowy sesji (po przejściu przez wszystkie karty w partii). Wyświetla statystyki oraz opcje: kontynuacja (nowe pobranie fiszek) lub powrót do widoku decku.
- **Główne elementy**:
  - Sekcja z krótkim podsumowaniem (np. „Zakończyłeś sesję”, liczby OK/NOK).
  - Dodatkowe informacje:
    - Ile kart z bieżącej partii zostało ocenionych.
    - Jaki procent due został „pokryty” w tej partii (np. `total_due` vs `reviewedCount`).
  - Przyciski:
    - „Kontynuuj naukę” – ponowne pobranie kart z API (nowa sesja).
    - „Powrót do decku” – link do `/decks/:deckId`.
- **Obsługiwane interakcje**:
  - Kliknięcie „Kontynuuj naukę” → reset stanu sesji i wywołanie `GET /api/learn/:deckId` ponownie.
  - Kliknięcie „Powrót do decku” → nawigacja do widoku decku.
- **Obsługiwana walidacja**:
  - Przycisk „Kontynuuj naukę” może być disabled, gdy trwa nowe ładowanie danych.
- **Typy**:
  - `LearnSessionStats`, `LearnSessionMetaViewModel`.
- **Propsy**:
  - `deckId: number`.
  - `stats: LearnSessionStats`.
  - `meta: LearnSessionMetaViewModel`.
  - `onContinue: () => void`.

### 5. Typy

- **DTO z backendu (już istniejące)**:
  - `FlashcardLearnDto = Pick<Flashcard, 'id' | 'front' | 'back'>;`
  - `LearnMetaDto { total_due: number; returned: number; deck_total: number; }`
  - `LearnResponseDto { data: FlashcardLearnDto[]; meta: LearnMetaDto; }`
  - `ReviewFlashcardItemCommand { flashcard_id: number; response: Extract<SpaceRepetitionStatus, 'OK' | 'NOK'>; }`
  - `ReviewFlashcardsCommand { review: ReviewFlashcardItemCommand[]; }`
- **Nowe typy ViewModel (frontend)** – sugerowane np. w `src/lib/learn/learn.types.ts`:
  - **`type ReviewResponse = 'OK' | 'NOK';`**
  - **`interface LearnFlashcardViewModel`**:
    - `id: number` – identyfikator fiszki.
    - `front: string` – przód karty (plain text).
    - `back: string` – tył karty (plain text).
    - `status: 'pending' | 'answered'` – status w ramach bieżącej sesji.
    - `lastResponse?: ReviewResponse` – ewentualna odpowiedź użytkownika na tę kartę.
  - **`interface LearnSessionMetaViewModel`**:
    - `totalDue: number` – liczba kart priorytetowych (NOK/not_checked) w partii z API (`meta.total_due`).
    - `returned: number` – liczba kart faktycznie zwróconych w tej partii (`meta.returned`).
    - `deckTotal: number` – łączna liczba kart w decku (`meta.deck_total`).
  - **`type LearnPhase = 'loading' | 'learning' | 'summary' | 'empty' | 'error';`**
  - **`interface LearnSessionStats`**:
    - `reviewedCount: number` – ile kart oceniono w bieżącej partii.
    - `okCount: number` – ile ocen „OK”.
    - `nokCount: number` – ile ocen „NOK”.
  - **`interface ReviewBufferItem`**:
    - `flashcardId: number;`
    - `response: ReviewResponse;`
  - **`interface LearnState`** (wewnętrzny typ hooka):
    - `phase: LearnPhase;`
    - `cards: LearnFlashcardViewModel[];`
    - `currentIndex: number;`
    - `isBackVisible: boolean;`
    - `meta: LearnSessionMetaViewModel | null;`
    - `stats: LearnSessionStats;`
    - `reviewBuffer: ReviewBufferItem[];`
    - `isFlushing: boolean;`
    - `errorMessage?: string;`

### 6. Zarządzanie stanem

- **Poziom komponentu**:
  - Cały stan sesji nauki przechowywany jest w `LearnPage` (lub w `useLearnSession`), bez globalnego store (zgodnie z planem: stan nauki lokalny).
- **Główne zmienne stanu**:
  - `phase: LearnPhase` – kontroluje, co jest renderowane (ładowanie/karta/podsumowanie/błąd/pusty stan).
  - `cards: LearnFlashcardViewModel[]` – lista fiszek dla bieżącej partii.
  - `currentIndex: number` – indeks aktualnej karty.
  - `isBackVisible: boolean` – czy odpowiedź aktualnej karty jest odsłonięta.
  - `meta: LearnSessionMetaViewModel | null` – dane meta z API.
  - `stats: LearnSessionStats` – liczniki OK/NOK oraz liczba ocenionych kart.
  - `reviewBuffer: ReviewBufferItem[]` – bufor lokalnych ocen oczekujących na wysyłkę do API.
  - `isFlushing: boolean` – flaga informująca o trwającym commitcie bufora do API.
  - `errorMessage?: string` – ostatni błąd (np. problem z API).
- **Custom hook `useLearnSession(deckId)`**:
  - **Wejście**:
    - `deckId: number`.
    - (opcjonalnie) `limit?: number` – domyślnie 50, zgodnie z `learnQuerySchema`.
  - **Zachowanie**:
    - Na mount:
      - `phase = 'loading'`.
      - Wywołanie `GET /api/learn/:deckId?limit=...`.
      - W przypadku powodzenia:
        - Mapowanie `FlashcardLearnDto[]` → `LearnFlashcardViewModel[]`.
        - Ustawienie `meta`.
        - Jeśli brak kart (`data.length === 0`), ustawienie `phase = 'empty'`.
        - W przeciwnym razie `phase = 'learning'`, `currentIndex = 0`.
      - W przypadku błędu (np. 404/500): `phase = 'error'`, ustawienie `errorMessage`.
    - Funkcja `revealAnswer()`:
      - Ustawia `isBackVisible = true`.
    - Funkcja `answerCurrent(response: ReviewResponse)`:
      - Jeśli `isBackVisible === false`, nic nie robi (guard).
      - Dodaje element do `reviewBuffer` (`flashcardId` aktualnej karty + `response`).
      - Aktualizuje `stats` (`reviewedCount++`, odpowiedni licznik OK/NOK).
      - Aktualizuje `cards[currentIndex].status = 'answered'` i `lastResponse = response`.
      - Jeśli `reviewBuffer.length >= FLUSH_THRESHOLD` (np. 10), wywołuje flush do API.
      - Przechodzi do kolejnej karty (`currentIndex + 1`), resetuje `isBackVisible = false`.
      - Jeśli to była ostatnia karta, przechodzi do `phase = 'summary'` i flushuje resztę bufora.
    - Funkcja `continueSession()`:
      - Resetuje lokalny stan sesji (cards, stats, buffer, index) i ponownie wywołuje `GET /api/learn/:deckId`.
    - Funkcja `goToDeck()`:
      - Zwraca ścieżkę `/decks/:deckId` lub wykonuje nawigację po stronie klienta (zależnie od istniejącej infrastruktury).
  - **Flush bufora ocen (`flushBuffer`)**:
    - Wysyła `PATCH /api/learn/review` z ciałem `{ review: ReviewBufferItem[] }`.
    - Dba o to, aby rozmiar tablicy nie przekraczał 100 (limit z `reviewFlashcardsSchema`) – w praktyce sesja nie przekroczy 50, ale kod może safety-slicować.
    - W przypadku sukcesu:
      - Czyści `reviewBuffer`.
    - W przypadku błędu:
      - Ustawia `errorMessage`.
      - Może pozostawić bufor w stanie niezmienionym, aby spróbować ponownie (np. przy kliknięciu „Kontynuuj”).

### 7. Integracja API

- **GET `/api/learn/:deckId`**:
  - **Żądanie**:
    - Metoda: `GET`.
    - Ścieżka: `/api/learn/${deckId}?limit=${limit}`.
  - **Walidacja po stronie serwera**:
    - `deckId` – positive integer (`deckIdParamSchema`).
    - `limit` – integer 1–100, domyślnie 50 (`learnQuerySchema`).
  - **Odpowiedź sukces (200)**:
    - `LearnResponseDto`:
      - `data: FlashcardLearnDto[]`.
      - `meta: { total_due, returned, deck_total }`.
  - **Obsługa w frontendzie**:
    - Mapowanie `data` na `LearnFlashcardViewModel[]`.
    - Wykorzystanie `meta` do inicjalizacji `LearnSessionMetaViewModel`.
    - Przy pustej liście → `phase = 'empty'`.
- **PATCH `/api/learn/review`**:
  - **Żądanie**:
    - Metoda: `PATCH`.
    - Body: `ReviewFlashcardsCommand { review: ReviewFlashcardItemCommand[] }`:
      - Każdy element:
        - `flashcard_id: number > 0`.
        - `response: 'OK' | 'NOK'`.
      - Min 1, max 100 elementów, brak duplikatów `flashcard_id` (sprawdzane też na backendzie).
  - **Odpowiedź sukces**:
    - API w implementacji backendowej zwraca 200 z `ApiResponse<{ updated: number }>` (plan zakładał 204, ale faktyczny endpoint zwraca dane – frontend może je jedynie logować/ignorować).
  - **Obsługa błędów**:
    - `400` – błąd walidacji (np. nieprawidłowe ID, response, zbyt wiele elementów) → komunikat inline + możliwość ponowienia wysyłki.
    - `404` – co najmniej jedna fiszka nie istnieje / nie należy do użytkownika → komunikat z informacją o problemie.
    - `500` – błąd DB → komunikat ogólny „Spróbuj ponownie”.

### 8. Interakcje użytkownika

- **Rozpoczęcie sesji (US-012)**:
  - Użytkownik klika „Ucz się” przy decku → przejście do `/learn/:deckId`.
  - Widok automatycznie ładuje fiszki z backendu i pokazuje pierwszą kartę (przód).
- **Odkrywanie odpowiedzi**:
  - Użytkownik klika „Pokaż odpowiedź” na `StudyCard`.
  - Tył karty staje się widoczny, a `ReviewControls` są aktywne.
- **Ocenianie znajomości fiszki (US-013)**:
  - Po odsłonięciu tyłu użytkownik widzi przyciski: „Nie wiedziałem” / „Wiedziałem”.
  - Po kliknięciu:
    - Odpowiedź trafia do `reviewBuffer`.
    - Statystyki (OK/NOK, liczba ocenionych) są aktualizowane.
    - Następna karta zostaje pokazana (przód, ukryty tył).
  - Po ocenieniu wszystkich kart:
    - Pokazywany jest `SummaryScreen`.
- **Kontynuacja sesji**:
  - Na `SummaryScreen` użytkownik ma opcję „Kontynuuj naukę”.
  - Kliknięcie powoduje pobranie nowej partii fiszek (jeśli są dostępne) i restart sesji lokalnej.
- **Powrót do decku**:
  - Kliknięcie „Powrót do decku” na `SummaryScreen` → nawigacja do `/decks/:deckId`.
- **Odświeżenie strony**:
  - Resetuje stan lokalny (świadoma decyzja w MVP) – po odświeżeniu sesja zaczyna się od nowa.

### 9. Warunki i walidacja

- **Warunki wejściowe/URL**:
  - `deckId` musi być dodatnią liczbą całkowitą. Widok zakłada, że trasa została wygenerowana poprawnie (przycisk „Ucz się” zapewnia prawidłowy link).
- **Walidacja danych z API**:
  - Oczekujemy struktury zgodnej z `LearnResponseDto`; w przypadku niespójności (np. brak `data` lub `meta`) komponent ustawia `phase = 'error'`.
- **Walidacja interakcji**:
  - Użytkownik nie może:
    - Ocenić karty zanim odsłoni odpowiedź (`ReviewControls` disabled).
    - Ocenić karty dwa razy (po ocenie przechodzimy do kolejnej, brak nawigacji wstecznej w MVP).
  - Review buffer:
    - Gwarancja braku duplikatów `flashcardId` w jednym request payload (zaprojektowana struktura bufora uniemożliwia duplikaty).
    - Rozmiar nie przekracza 100 elementów (limit walidacji backendu).
- **Bezpieczeństwo treści**:
  - Front i back fiszek są renderowane jako czysty tekst, nie jako HTML, z `white-space: pre-wrap`.
- **Walidacja odpowiedzi użytkownika**:
  - `response` jest typowany jako `'OK' | 'NOK'` i nigdy nie opuszcza tego zbioru na poziomie UI, więc API nigdy nie otrzyma nieprawidłowej wartości.

### 10. Obsługa błędów

- **Błędy podczas `GET /api/learn/:deckId`**:
  - `404 Deck not found`:
    - UI pokazuje stan błędu z informacją „Nie znaleziono decku” i przyciskiem powrotu do listy decków.
  - `401 Unauthorized`:
    - Na poziomie globalnym – redirect do `/auth/login` (zgodnie z guardem tras).
  - `500` / inne błędy:
    - `phase = 'error'`, czytelny komunikat, możliwość odświeżenia strony („Spróbuj ponownie”).
- **Błędy podczas `PATCH /api/learn/review`**:
  - `400`:
    - UI wyświetla toast/InlineError „Nie udało się zapisać części odpowiedzi – spróbuj ponownie”.
    - Bufor nie jest czyszczony; użytkownik może ponowić wysyłkę (np. przy końcu sesji).
  - `404`:
    - Informacja, że co najmniej jedna z kart nie istnieje. W MVP traktujemy to jako nieodwracalny błąd dla danej partii; UI może zasugerować ponowne rozpoczęcie sesji.
  - `500`:
    - Komunikat ogólny i możliwość ponownego flushu.
- **Błędy sieciowe**:
  - Traktowane analogicznie do 500 – komunikat i przycisk „Spróbuj ponownie”.

### 11. Kroki implementacji

1. **Przygotowanie typów i helperów**:
   - Dodać plik `src/lib/learn/learn.types.ts` z typami ViewModel (`LearnFlashcardViewModel`, `LearnSessionMetaViewModel`, `LearnSessionStats`, `ReviewBufferItem`, `LearnPhase`, `ReviewResponse`).
   - (Opcjonalnie) dodać prosty helper do mapowania `FlashcardLearnDto` → `LearnFlashcardViewModel`.
2. **Implementacja routingu Astro**:
   - Utworzyć plik `src/pages/learn/[deckId].astro`, który:
     - Czyta `deckId` z `Astro.params`.
     - Osadza Reactową wyspę `LearnPage` z propem `deckId`.
3. **Stworzenie hooka `useLearnSession`**:
   - Zaimplementować logikę pobierania danych z `GET /api/learn/:deckId`, zarządzania stanem fazy, buforem, statystykami i funkcjami `revealAnswer`, `answerCurrent`, `continueSession`, `goToDeck`.
   - Dodać batching ocen (flush co X odpowiedzi lub na końcu sesji).
4. **Implementacja komponentu `LearnPage`**:
   - Użyć `useLearnSession` i na podstawie `phase` renderować:
     - Skeleton / loading.
     - Główny widok nauki (`ProgressBar`, `SessionCounter`, `StudyCard`, `ReviewControls`).
     - `SummaryScreen`.
     - Stan błędu/pusty.
5. **Implementacja komponentów prezentacyjnych**:
   - `StudyCard` – UI karty z przodem/tyłem, przyciskiem „Pokaż odpowiedź”.
   - `ReviewControls` – przyciski OK/NOK z obsługą `onAnswer`.
   - `ProgressBar` i `SessionCounter` – czytelne prezentowanie postępu i statystyk.
   - `SummaryScreen` – podsumowanie, CTA kontynuacji i powrotu do decku.
6. **Integracja z API**:
   - Dodać funkcje helperowe `fetchLearn(deckId, limit)` i `sendReviews(reviewBuffer)` (lub użyć istniejącej warstwy fetch/HTTP, jeśli jest).
   - Upewnić się, że nagłówki autoryzacji są spójne z resztą aplikacji (Supabase Auth / `locals.supabase`).
7. **Dopracowanie UX/A11Y**:
   - Dodać odpowiednie etykiety, role, focus management (np. focus na karcie po zmianie, focus na przycisku „Pokaż odpowiedź”/przyciskach OK/NOK).
   - Zapewnić spójność z resztą aplikacji (Tailwind/shadcn/ui, stany disabled, toasty).


