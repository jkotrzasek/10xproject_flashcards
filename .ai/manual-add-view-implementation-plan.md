## Plan implementacji widoku Dodawanie manualne

## 1. Przegląd

Widok „Dodawanie manualne” służy do ręcznego tworzenia jednej lub wielu fiszek (front/back) w jednym kroku, z możliwością przypisania ich do wybranego decku lub pozostawienia jako „Nieprzypisane”. Umożliwia on zarówno szybkie dodanie pojedynczej fiszki (szczególnie z kontekstu konkretnego decku – US‑009), jak i dodanie całej serii fiszek na raz. Widok opiera się na formularzu React z walidacją inline (Zod), integruje się z endpointami `GET /api/decks` oraz `POST /api/flashcards` i używa globalnych mechanizmów feedbacku (`Toast`, `InlineError`).

## 2. Routing widoku

Widok jest dostępny pod ścieżką Astro: `/manual`. Strona Astro `src/pages/manual.astro` korzysta z layoutu aplikacji (`Layout.astro`) i renderuje wewnątrz wyspę React z głównym komponentem widoku (np. `ManualFlashcardView`). Widok powinien obsługiwać opcjonalny parametr query `deckId` (np. `/manual?deckId=5`) służący do preselekcji decku, co pozwala realizować user story US‑009 („Dodaj fiszkę” z kontekstu konkretnego decku).

## 3. Struktura komponentów

Główna struktura komponentów dla tego widoku:

- **`ManualPage` (Astro, `src/pages/manual.astro`)** – strona odpowiadająca za routing i osadzenie widoku w layoutcie.
- **`ManualFlashcardView` (React island)** – komponent kontener, odpowiedzialny za pobranie listy decków, obsługę stanów ładowania/błędów oraz renderowanie formularza.
- **`ManualFlashcardForm` (React)** – główny formularz do dodawania fiszek (wiele wierszy, walidacja, submit).
- **`ManualFlashcardRow` (React)** – reprezentacja pojedynczego wiersza formularza (front/back, liczniki, błędy, usuwanie).
- **`DeckSelect` (React, reużywalny)** – selektor decku (z opcją „Nieprzypisane”).
- **`SubmitButton` (React, reużywalny)** – przycisk wysyłający formularz, z obsługą stanu „loading”.
- **`InlineError` / `Toast` (istniejące globalne komponenty)** – prezentacja błędów lokalnych i globalnych.

Relacje:

- `ManualPage` renderuje `Layout` oraz wewnątrz React island `ManualFlashcardView`.
- `ManualFlashcardView` pobiera decki z `/api/decks`, tworzy listę opcji do `DeckSelect` i przekazuje ją oraz ewentualne `initialDeckId` do `ManualFlashcardForm`.
- `ManualFlashcardForm` zarządza lokalnym stanem formularza oraz integruje się z API `/api/flashcards`.
- `ManualFlashcardForm` renderuje `DeckSelect`, listę `ManualFlashcardRow` oraz `SubmitButton`, przy czym przekazuje per‑row błędy do `ManualFlashcardRow`.

## 4. Szczegóły komponentów

### `ManualPage` (Astro, strona routingu)

- **Opis komponentu**: Prosta strona Astro, która osadza widok w globalnym layoutcie (`Layout.astro`), ustawia tytuł strony i inicjuje React island z widokiem manualnym. Może odczytać query param `deckId` po stronie klienta lub przekazać go jako props do React island, w zależności od przyjętego wzorca w projekcie.
- **Główne elementy**: 
  - `Layout` z odpowiednim `title` (np. „Dodawanie manualne – AI Flashcard Generator”).
  - Wewnątrz `Layout` – React island, np. `<ManualFlashcardView client:load ... />`.
- **Obsługiwane interakcje**: Brak bezpośrednich interakcji użytkownika (wszystko dzieje się w React).
- **Obsługiwana walidacja**: Brak lokalnej walidacji; ewentualne walidacje routingu/auth są globalne (middleware).
- **Typy**:
  - Może przekazać `initialDeckId?: number` do React komponentu, np. odczytując query po stronie serwera lub zostawiając odczyt po stronie klienta.
- **Propsy**:
  - `initialDeckId?: number | null` – opcjonalny, używany do preselekcji decku w formularzu (np. przy wejściu z `/decks/:id`).

### `ManualFlashcardView` (React island)

- **Opis komponentu**: Kontener widoku manualnego dodawania fiszek. Odpowiada za pobranie listy decków użytkownika z `/api/decks`, mapowanie ich na `DeckOptionViewModel` oraz przekazanie danych i stanów do `ManualFlashcardForm`. Obsługuje stany ładowania (`loading`), błędów ładowania decków oraz logikę preselekcji decku na podstawie `initialDeckId`.
- **Główne elementy**:
  - Sekcja nagłówka (np. tytuł „Dodaj fiszki manualnie”, krótki opis).
  - Warunkowe renderowanie:
    - skeleton lub placeholder podczas ładowania decków,
    - `InlineError` przy błędzie wczytywania decków (z możliwością ponowienia),
    - `ManualFlashcardForm` po poprawnym załadowaniu decków.
- **Obsługiwane interakcje**:
  - Ponowne pobranie decków po błędzie (np. przycisk „Spróbuj ponownie”).
- **Obsługiwana walidacja**:
  - Walidacja `initialDeckId` – jeżeli nie istnieje w pobranej liście, nie jest ustawiany w formularzu; można wyświetlić ostrzeżenie (np. toast).
- **Typy**:
  - `DeckDto` – typ decków z `/api/decks`.
  - `DeckOptionViewModel` – uproszczony model dla selektora:
    - `id: number | null`
    - `label: string`
    - `flashcardCount?: number`
  - Lokalny typ stanu:
    - `decks: DeckDto[]`
    - `isLoading: boolean`
    - `error?: string`
- **Propsy**:
  - `initialDeckId?: number | null` – opcjonalny identyfikator decku do preselekcji.

### `ManualFlashcardForm` (React)

- **Opis komponentu**: Główny formularz odpowiedzialny za budowanie payloadu do `POST /api/flashcards`, zarządzanie lokalnym stanem wielu wierszy fiszek, walidację client‑side oraz obsługę success/failure (z wykorzystaniem `Toast` i `InlineError`). Umożliwia dodawanie, usuwanie i edytowanie wielu fiszek w jednym widoku.
- **Główne elementy**:
  - Sekcja błędu globalnego (`InlineError` na górze formularza, np. przy błędach serwera).
  - `DeckSelect` do wyboru decku lub „Nieprzypisane”.
  - Lista komponentów `ManualFlashcardRow` reprezentujących każdą dodawaną fiszkę.
  - Przycisk „Dodaj kolejną fiszkę” (dodawanie nowego wiersza).
  - `SubmitButton` typu `submit` z tekstem np. „Zapisz fiszki”.
- **Obsługiwane interakcje**:
  - Zmiana decku: aktualizacja `values.deckId`, czyszczenie błędu `errors.deckId`.
  - Zmiana tekstu front/back w wierszu: aktualizacja odpowiadającego `ManualFlashcardRowViewModel`.
  - Dodanie nowego wiersza: utworzenie nowej instancji `ManualFlashcardRowViewModel` z pustymi polami i nowym ID.
  - Usunięcie wiersza: usunięcie z tablicy (zabezpieczenie, by nie usunąć ostatniego wiersza – zamiast tego można wyczyścić pola).
  - Submit formularza:
    - Walidacja local Zod.
    - Wywołanie `POST /api/flashcards`.
    - Prezentacja sukcesu/błędów.
- **Obsługiwana walidacja**:
  - Na poziomie pól (na podstawie reguł z backendu):
    - `front`: `trim().length` w zakresie 1–200.
    - `back`: `trim().length` w zakresie 1–500.
  - Na poziomie formularza:
    - Przynajmniej jeden wiersz z poprawnie wypełnionym front/back.
    - W przypadku pustych wszystkich wierszy – błąd globalny.
  - Walidacja decku:
    - Deck jest opcjonalny; `deckId` może być `null` → „Nieprzypisane”.
    - W przypadku błędu 404 z backendu (deck usunięty) – ustawiany jest błąd przy `DeckSelect`.
- **Typy**:
  - `ManualFlashcardRowId = string`.
  - `ManualFlashcardRowViewModel`:
    - `id: ManualFlashcardRowId`
    - `front: string`
    - `back: string`
  - `ManualFlashcardRowErrors`:
    - `front?: string`
    - `back?: string`
  - `ManualFlashcardFormValues`:
    - `deckId: number | null`
    - `rows: ManualFlashcardRowViewModel[]`
  - `ManualFlashcardFormErrors`:
    - `deckId?: string`
    - `rows: Record<ManualFlashcardRowId, ManualFlashcardRowErrors>`
    - `form?: string`
  - `ManualFlashcardFormState`:
    - `values: ManualFlashcardFormValues`
    - `errors: ManualFlashcardFormErrors`
    - `isSubmitting: boolean`
    - `submitSucceeded: boolean`
  - DTO:
    - `CreateFlashcardItemCommand`
    - `CreateFlashcardsCommand`
    - `FlashcardCreatedDto`
- **Propsy**:
  - `deckOptions: DeckOptionViewModel[]` – opcje do selektora decku (zawiera także „Nieprzypisane”).
  - `initialDeckId?: number | null` – opcjonalny deck preselekcjonowany w formularzu.
  - Opcjonalne callbacki (np. `onSuccess`), np. do obsługi redirectu do decku po sukcesie.

### `ManualFlashcardRow` (React)

- **Opis komponentu**: Prezentuje pojedynczą fiszkę w ramach formularza (front i back) wraz z licznikami znaków, błędami walidacji oraz przyciskiem usuwania wiersza. Jest w pełni kontrolowany przez `ManualFlashcardForm` (props → JSX).
- **Główne elementy**:
  - Dwa pola tekstowe (np. `Textarea` z shadcn/ui) dla front i back, z Tailwindowym layoutem (np. kolumny na desktop, stos na mobile).
  - Liczniki znaków (np. pod każdym polem: `X/200`, `Y/500`).
  - `InlineError` pod każdym polem przy błędach walidacji.
  - Przycisk „Usuń” przy wierszu (np. ikonka kosza).
- **Obsługiwane interakcje**:
  - `onChange` front/back → wywołanie callbacku z nową wartością.
  - `onBlur` front/back → opcjonalne odpalenie walidacji on-blur (jeśli logika walidacji to wspiera).
  - `onClick` „Usuń” → usunięcie wiersza z formularza (przy pomocy callbacku z rodzica).
- **Obsługiwana walidacja**:
  - Wyłącznie prezentacja przekazanych błędów stringowych (brak własnej logiki walidacji).
  - Liczniki znaków bazujące na aktualnej zawartości (np. `value.trim().length`).
- **Typy**:
  - `row: ManualFlashcardRowViewModel`
  - `errors?: ManualFlashcardRowErrors`
- **Propsy**:
  - `row: ManualFlashcardRowViewModel`
  - `errors?: ManualFlashcardRowErrors`
  - `onChangeFront: (id: ManualFlashcardRowId, value: string) => void`
  - `onChangeBack: (id: ManualFlashcardRowId, value: string) => void`
  - `onRemove: (id: ManualFlashcardRowId) => void`

### `DeckSelect` (React)

- **Opis komponentu**: Reużywalny komponent selektora decku wykorzystywany w kilku widokach, w tym w widoku manualnym. Udostępnia listę decków do wyboru oraz opcję „Nieprzypisane” (brak decku). Może korzystać z komponentu `Select` z shadcn/ui.
- **Główne elementy**:
  - Label (np. „Deck”).
  - Select z opcjami:
    - „Nieprzypisane” (value reprezentuje `null`).
    - Lista decków z backendu (np. nazwa + liczba fiszek).
  - `InlineError` pod selectem przy błędach (np. deck usunięty).
- **Obsługiwane interakcje**:
  - Zmiana selekcji → callback z `number | null`.
- **Obsługiwana walidacja**:
  - Walidacja prostego typu (czy wybrana wartość jest wśród dostępnych opcji).
  - Przy błędzie 404 decku – pokazanie komunikatu „Wybrany deck został usunięty. Wybierz inny deck lub pozostaw puste.”.
- **Typy**:
  - `DeckOptionViewModel` (opisany wyżej).
- **Propsy**:
  - `options: DeckOptionViewModel[]`
  - `value: number | null`
  - `onChange: (value: number | null) => void`
  - `error?: string`

### `SubmitButton` (React)

- **Opis komponentu**: Button wysyłający formularz, z wbudowaną obsługą stanu „loading” i disabled. Bazuje na komponencie `Button` z shadcn/ui, stylowany w spójny sposób z resztą aplikacji.
- **Główne elementy**:
  - `button` typu `submit` z labelką (np. „Zapisz fiszki”).
  - Indykacja `isLoading` (spinner, zmiana labelki na „Zapisywanie…”).
- **Obsługiwane interakcje**:
  - `onClick` (jako submit formularza) – logika submitu obsługiwana przez `ManualFlashcardForm`.
- **Obsługiwana walidacja**:
  - Brak własnej walidacji; przyjmuje jedynie flagi `disabled`/`isLoading`.
- **Typy**:
  - Prosty interfejs: `isLoading: boolean`, `disabled?: boolean`.
- **Propsy**:
  - `isLoading: boolean`
  - `disabled?: boolean`
  - `children: ReactNode`

## 5. Typy

Typy istniejące (DTO) używane w tym widoku:

- **`DeckDto`** (z `src/types.ts`): 
  - `id: number`
  - `name: string`
  - `created_at: string`
  - `updated_at: string`
  - `flashcard_count: number`
- **`CreateFlashcardItemCommand`**:
  - `front: string`
  - `back: string`
- **`CreateFlashcardsCommand`**:
  - `deck_id?: number | null`
  - `source: FlashcardSource` (`"manual"` w tym widoku)
  - `generation_id: number | null` (`null` w tym widoku)
  - `flashcards: CreateFlashcardItemCommand[]`
- **`FlashcardCreatedDto`**:
  - `id: number`
  - `front: string`
  - `back: string`
- **`ApiResponse<T>` / `ApiErrorResponse`** – opakowania odpowiedzi API.

Nowe typy ViewModel i stanów:

- **`DeckOptionViewModel`**:
  - `id: number | null` – `null` = „Nieprzypisane”.
  - `label: string` – nazwa do wyświetlenia w UI.
  - `flashcardCount?: number` – liczba fiszek (opcjonalnie).

- **`ManualFlashcardRowId`**:
  - alias: `type ManualFlashcardRowId = string;`
  - używany jako klucz wiersza i index w mapie błędów.

- **`ManualFlashcardRowViewModel`**:
  - `id: ManualFlashcardRowId`
  - `front: string`
  - `back: string`

- **`ManualFlashcardRowErrors`**:
  - `front?: string` – komunikat błędu lub `undefined`, gdy brak błędu.
  - `back?: string`

- **`ManualFlashcardFormValues`**:
  - `deckId: number | null`
  - `rows: ManualFlashcardRowViewModel[]`

- **`ManualFlashcardFormErrors`**:
  - `deckId?: string`
  - `rows: Record<ManualFlashcardRowId, ManualFlashcardRowErrors>`
  - `form?: string`

- **`ManualFlashcardFormState`**:
  - `values: ManualFlashcardFormValues`
  - `errors: ManualFlashcardFormErrors`
  - `isSubmitting: boolean`
  - `submitSucceeded: boolean`

- **`ManualFlashcardApiRequest`**:
  - alias: `type ManualFlashcardApiRequest = CreateFlashcardsCommand;`
  - w praktyce payload: 
    - `deck_id: number | null`
    - `source: "manual"`
    - `generation_id: null`
    - `flashcards: { front: string; back: string }[]`

## 6. Zarządzanie stanem

Stan tego widoku jest w całości lokalny dla React (brak potrzeby globalnego store). `ManualFlashcardView` zarządza stanem pobierania decków: `decks`, `isLoading`, `error`, oraz przekazuje gotową listę opcji do `ManualFlashcardForm`. `ManualFlashcardForm` zarządza stanem formularza w strukturze `ManualFlashcardFormState`, obejmującej wartości pól, błędy i stan submitu. Przy interakcjach użytkownika (zmiana decku, wpisywanie front/back, dodawanie/usuwanie wierszy) stan jest aktualizowany przez kontrolowane komponenty (controlled inputs). Przy submit formularza komponent przeprowadza pełną walidację, a w razie sukcesu resetuje wybrane części stanu (np. czyści wiersze, zachowuje wybrany deck).

Rekomendowane jest wydzielenie logicznego hooka `useManualFlashcardForm(initialDeckId?: number | null)`, który enkapsuluje:

- aktualny `formState`,
- funkcje aktualizacji poszczególnych części (`setDeckId`, `updateRow`, `addRow`, `removeRow`, `submit`),
- integrację z walidacją Zod.

Dodatkowo hook `useDeckOptions(initialDeckId?: number | null)` może odpowiadać za pobieranie decków i mapowanie do `DeckOptionViewModel[]`, udostępniając stany `options`, `isLoading`, `error`. Dzięki temu komponenty pozostają „chude”, a logika jest łatwa do testowania i reużycia.

## 7. Integracja API

Widok korzysta z dwóch endpointów:

1. **`GET /api/decks`** – pobranie listy decków użytkownika.
   - Żądanie:
     - metoda: `GET`
     - opcjonalnie query: `sort=name_asc` (dla wygodnej alfabetycznej listy w selektorze).
   - Odpowiedź:
     - `200 OK` z `ApiResponse<DeckDto[]>`.
   - Obsługa:
     - Po sukcesie: mapowanie `DeckDto[]` na `DeckOptionViewModel[]` oraz dodanie opcji „Nieprzypisane”.
     - Błąd `401`: obsługiwany globalnie (redirect do logowania).
     - Inne błędy: ustawienie `error` w `ManualFlashcardView` oraz wyświetlenie `InlineError`.

2. **`POST /api/flashcards`** – zapis manualnie dodanych fiszek.
   - Żądanie:
     - metoda: `POST`
     - body typu `ManualFlashcardApiRequest`:
       - `deck_id: selectedDeckId ?? null`
       - `source: "manual"`
       - `generation_id: null`
       - `flashcards: values.rows.map(({ front, back }) => ({ front, back }))`
   - Walidacja po stronie API:
     - `front`: `trim().length` 1–200.
     - `back`: `trim().length` 1–500.
     - `flashcards`: min 1 element.
     - `source`: jedna z `["ai_full","ai_edited","manual"]`; tu zawsze `"manual"`.
     - `generation_id`: dla `manual` musi być `null`.
     - `deck_id`: jeżeli liczba, musi wskazywać istniejący deck użytkownika, w przeciwnym razie 404.
   - Odpowiedzi:
     - `201 Created` z `ApiResponse<FlashcardCreatedDto[]>` przy sukcesie.
     - `400 Bad Request` przy błędach walidacji (np. naruszenie limitów długości).
     - `404 Not Found` z kodami `DECK_NOT_FOUND` / `GENERATION_NOT_FOUND` (tu tylko pierwszy przypadek ma znaczenie).
     - `500 Internal Server Error` z `DATABASE_ERROR` lub `INTERNAL_ERROR`.
   - Obsługa po stronie widoku:
     - Sukces:
       - toast „Dodano X fiszek”.
       - wyczyszczenie wierszy (np. pozostawienie jednego pustego) i zachowanie wybranego decku.
       - opcjonalnie, jeżeli `initialDeckId` było ustawione, pokazanie linku „Powróć do decku”.
     - 400:
       - pokazanie komunikatu z backendu w `errors.form`,
       - toast informujący o błędzie walidacji.
     - 404 `DECK_NOT_FOUND`:
       - ustawienie `values.deckId = null`,
       - odświeżenie listy decków,
       - ustawienie błędu przy `DeckSelect` („Wybrany deck został usunięty. Wybierz inny deck lub pozostaw puste.”).
     - 500:
       - toast z generycznym komunikatem o błędzie serwera,
       - pozostawienie wprowadzonych danych, odblokowanie przycisku.

## 8. Interakcje użytkownika

Główne scenariusze interakcji:

- **Wejście na `/manual` bez parametrów**:
  - Użytkownik widzi nagłówek widoku, pusty formularz z jednym wierszem fiszki (puste front/back) i selektorem decku ustawionym na „Nieprzypisane”.
  - Focus trafia w pole front pierwszego wiersza.

- **Wejście na `/manual?deckId=:id` z widoku decku**:
  - Po załadowaniu decków `ManualFlashcardView` weryfikuje, czy `deckId` jest na liście.
  - Jeżeli tak: `DeckSelect` jest preselekcjonowany na dany deck, użytkownik może od razu wpisać front/back.
  - Jeżeli nie: selektor pozostaje na „Nieprzypisane”, można pokazać toast z ostrzeżeniem.

- **Wpisywanie tekstu w polach front/back**:
  - W trakcie wpisywania aktualizuje się licznik znaków (np. `10/200`).
  - Po przekroczeniu limitu licznik i obramowanie pola mogą zmienić kolor (np. na czerwony).
  - Jeżeli użytkownik pozostawia puste pole i próbuje wysłać formularz – pod polem pojawia się komunikat błędu.

- **Dodanie nowej fiszki**:
  - Kliknięcie przycisku „Dodaj kolejną fiszkę” dodaje nowy wiersz na końcu listy.
  - Focus przechodzi na front nowo dodanej fiszki.

- **Usunięcie wiersza**:
  - Kliknięcie ikony/przycisku „Usuń” przy danym wierszu usuwa go z formularza.
  - Jeśli wiersz jest jedynym istniejącym, można zamiast usuwania wyczyścić pola, aby zawsze mieć co najmniej jeden wiersz do edycji.

- **Submit formularza**:
  - Kliknięcie `SubmitButton` (lub Enter w formularzu) wywołuje walidację:
    - Wiersze z pustymi lub zbyt długimi polami są oznaczone błyskawicznie.
    - Jeśli żaden wiersz nie jest poprawnie wypełniony, nad formularzem pojawia się błąd globalny.
  - Jeżeli walidacja przejdzie:
    - Przycisk przechodzi w stan „Zapisywanie…”, jest disabled.
    - Po sukcesie:
      - wyświetlany jest toast z informacją, ile fiszek utworzono,
      - wiersze są czyszczone (zostaje jeden pusty), deck pozostaje wybrany.
    - W przypadku błędów:
      - użytkownik widzi odpowiedni komunikat i może poprawić dane lub zmienić deck.

## 9. Warunki i walidacja

Walidacja w tym widoku powinna wiernie odzwierciedlać zasady z backendu:

- **Dla pól front/back**:
  - `front`: `trim().length` w zakresie 1–200.
  - `back`: `trim().length` w zakresie 1–500.
  - Te zasady są wymuszone w `createFlashcardItemSchema` na backendzie; w kliencie należy odtworzyć je z użyciem Zod, aby uniknąć rozjazdów.

- **Dla tablicy fiszek**:
  - Musi zawierać co najmniej jeden element.
  - Walidacja formularza powinna wymuszać, by co najmniej jeden wiersz był poprawny; w przeciwnym razie pojawia się błąd globalny.

- **Dla decku**:
  - `deckId` w formularzu może być `number` lub `null`.
  - Wartość `null` jest mapowana na „Nieprzypisane” i powoduje wysłanie `deck_id: null` (lub pominięcie pola).
  - W przypadku błędu 404 (deck nie istnieje) UI musi wskazać użytkownikowi, by wybrał inny deck.

- **Dla pól stałych**:
  - `source` jest zawsze ustawiane na `"manual"` (bez możliwości zmiany przez UI).
  - `generation_id` jest zawsze `null` (brak powiązania z generacją AI).

Wszystkie błędy walidacji powinny być prezentowane zarówno inline (przy polach), jak i – w przypadku błędów ogólnych/formalnych – w sekcji błędu globalnego nad formularzem. Pola formularza powinny mieć powiązane etykiety i `aria-describedby` wskazujące na element z komunikatem błędu, aby zachować dobre praktyki A11Y.

## 10. Obsługa błędów

Obsługa błędów powinna obejmować:

- **Błędy walidacji client‑side**:
  - Puste lub zbyt długie pola front/back: komunikaty pod polami, kolorystyczne wyróżnienie.
  - Brak poprawnych wierszy: globalny komunikat przy formularzu.

- **Błędy ładowania decków (GET /api/decks)**:
  - Błąd sieciowy lub serwerowy: `ManualFlashcardView` ustawia `error` i pokazuje `InlineError` z krótkim opisem oraz przyciskiem „Spróbuj ponownie”.
  - 401: przekierowanie do logowania obsługiwane globalnie (middleware/guard).

- **Błędy zapisu fiszek (POST /api/flashcards)**:
  - `400 INVALID_INPUT`: wyświetlenie komunikatu (z backendu) jako `errors.form` oraz toast z informacją, że wystąpił błąd walidacji.
  - `404 DECK_NOT_FOUND`: reset wybranego decku do `null`, ponowne pobranie listy decków i pokazanie komunikatu „Wybrany deck został usunięty”.
  - `500 DATABASE_ERROR` / `INTERNAL_ERROR`: toast z generycznym komunikatem („Wystąpił błąd serwera. Spróbuj ponownie później.”), brak czyszczenia formularza.
  - Błędy sieciowe (np. offline): toast z informacją o problemie z połączeniem oraz utrzymanie stanu formularza.

Wszystkie błędy powinny odblokowywać przycisk submit po zakończeniu obsługi (brak „wiecznych” loadingów). Dodatkowo, przy krytycznych błędach backendu warto logować szczegóły (np. w konsoli) dla ułatwienia debugowania podczas developmentu.

## 11. Kroki implementacji

1. **Przygotowanie typów i ewentualnych helperów**  
   - Zweryfikować importy istniejących typów w `src/types.ts` (`DeckDto`, `CreateFlashcardsCommand`, `CreateFlashcardItemCommand`, `FlashcardCreatedDto`, `ApiResponse`, `ApiErrorResponse`).  
   - Dodać (jeśli potrzeba) definicje typów widoku w osobnym pliku, np. `src/lib/view-models/manual-flashcards.types.ts` (`DeckOptionViewModel`, `ManualFlashcardRowViewModel`, `ManualFlashcardFormState` itd.).  
   - Przygotować klienta fetchującego decki i zapisującego fiszki (np. helpery `fetchDecks`, `createManualFlashcards`) z odpowiednimi typami.

2. **Uzupełnienie strony Astro `src/pages/manual.astro`**  
   - Rozszerzyć istniejący plik tak, aby oprócz `Layout` renderował React island `ManualFlashcardView` (`client:load` lub inna strategia zgodna z projektem).  
   - Ustawić poprawny tytuł strony i ewentualnie meta‑opis.  
   - Zaplanować sposób przekazania `initialDeckId` (jeśli projekt wykorzystuje przekazywanie query params do Reacta po stronie serwera, obsłużyć to tutaj; w przeciwnym razie React sam odczyta `window.location.search`).

3. **Implementacja `ManualFlashcardView`**  
   - Utworzyć plik React, np. `src/components/manual/ManualFlashcardView.tsx`.  
   - Zaimplementować logikę pobierania decków z `GET /api/decks` (z obsługą `loading` i `error`).  
   - Zmapować `DeckDto[]` na `DeckOptionViewModel[]`, dodając opcję „Nieprzypisane” (`id = null`).  
   - Odczytać `initialDeckId` (z propsa lub z URL) i przekazać go do `ManualFlashcardForm`.  
   - Zaimplementować renderowanie:
     - skeleton lub placeholder przy `isLoading = true`,  
     - `InlineError` i przycisk „Spróbuj ponownie” przy błędzie,  
     - `ManualFlashcardForm` przy sukcesie.

4. **Implementacja hooka `useManualFlashcardForm`**  
   - Utworzyć hook (np. `src/lib/hooks/useManualFlashcardForm.ts`).  
   - Zdefiniować stan początkowy: jeden pusty wiersz (`front=""`, `back=""`), `deckId` ustawiony na `initialDeckId ?? null`, puste błędy, `isSubmitting = false`.  
   - Zaimplementować funkcje:
     - `setDeckId(deckId: number | null)` – aktualizuje `values.deckId` i czyści ewentualny błąd decku.  
     - `addRow()` – dodaje nowy wiersz z nowym `id`.  
     - `removeRow(id)` – usuwa wiersz lub czyści, jeżeli to ostatni.  
     - `updateRow(id, changes)` – aktualizuje `front/back` w danym wierszu.  
     - `validateRow(row)` i `validateForm()` – wykorzystujące Zod (client‑side schema na wzór `createFlashcardItemSchema`).  
     - `submit()` – wykonuje walidację, buduje payload `ManualFlashcardApiRequest`, wysyła `POST /api/flashcards`, aktualizuje stan (`isSubmitting`, `errors`, `submitSucceeded`) i wywołuje ewentualny callback `onSuccess`.

5. **Implementacja `ManualFlashcardForm`**  
   - Utworzyć komponent (np. `src/components/manual/ManualFlashcardForm.tsx`) korzystający z hooka `useManualFlashcardForm`.  
   - Zaimplementować layout formularza z wykorzystaniem `DeckSelect`, listy `ManualFlashcardRow`, `InlineError` i `SubmitButton`.  
   - Powiązać handlers z hooka (`setDeckId`, `updateRow`, `addRow`, `removeRow`, `submit`) z odpowiednimi zdarzeniami formularza.  
   - Zadbać o a11y: etykiety pól, `aria-describedby`, focus management po błędach (np. focus na pierwszym błędnym polu po nieudanym submit).

6. **Implementacja `ManualFlashcardRow`**  
   - Utworzyć komponent (np. `src/components/manual/ManualFlashcardRow.tsx`).  
   - Zaimplementować dwa pola tekstowe (front/back) z licznikami znaków i możliwością wyświetlania błędów.  
   - Dodać przycisk usuwania wiersza oraz odpowiednie aria‑atrybuty.  
   - Dbać o stylowanie przy pomocy Tailwind + shadcn/ui, zgodnie z resztą aplikacji.

7. **Integracja `DeckSelect` i `SubmitButton`**  
   - Jeżeli reużywalne komponenty `DeckSelect` i `SubmitButton` już istnieją – wykorzystać je, dodając ewentualnie brakujące propsy.  
   - Jeśli nie istnieją – utworzyć je w katalogu wspólnym (np. `src/components/common`), by móc użyć także w innych widokach.  
   - Zadbać, aby `DeckSelect` poprawnie akceptował `null` dla opcji „Nieprzypisane” i emitował `null` w `onChange`.

8. **Obsługa success flow i integracja z innymi widokami**  
   - Po pomyślnym `POST /api/flashcards` wyświetlać toast z liczbą utworzonych fiszek.  
   - Zresetować wiersze (pozostawić jeden pusty), zachowując wybrany deck.  
   - Jeżeli formularz został otwarty z konkretnego decku (jest `initialDeckId`), rozważyć pokazanie dodatkowego CTA w UI (np. przycisk „Powróć do decku”), które nawigowałoby do `/decks/:deckId`.  


