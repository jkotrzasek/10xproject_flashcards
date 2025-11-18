# Architektura UI dla 10xproject_flashcards

## 1. Przegląd struktury UI

Aplikacja kliencka oparta na Astro 5 (routing, SSR/SSG) z komponentami React 19 dla interaktywności. Warstwa wizualna w Tailwind 4 oraz komponenty z shadcn/ui. Architektura UI rozdziela dane efemeryczne (propozycje flashcard z generacji AI w pamięci) od danych trwałych (decks/flashcards na serwerze).

- Warstwa routingu: strony w `src/pages` (Astro), widoki dynamiczne jako wyspy React.
- Stan: 
  - Lokalny (React) dla: propozycji AI, bufora ocen w nauce, formularzy, UI state (skeletons, toasty, dialogi).
  - Serwerowy (fetch do `/api/...`) dla: decków, fiszek, nauki, limitów AI. Brak cache persystentnego w MVP.
- Bezpieczeństwo: wyłącznie plain text w treściach fiszek (renderowanie z `white-space: pre-wrap`), brak HTML/Markdown → ochrona przed XSS. Dane użytkownika limitowane RLS (po stronie DB). UI nie wyświetla wewnętrznych ID użytkownika.
- Dostępność (A11Y): etykiety i opisy dla pól, focus management w dialogach, odpowiedni kontrast, role/aria-* dla elementów interaktywnych.
- UX: skeleton loading podczas generowania AI, blokady przycisków przy operacjach krytycznych, walidacja inline (Zod po stronie klienta), toasty dla sukcesów/krótkich informacji, błędy inline przy polach. Responsywna nawigacja: linki desktop, hamburger na mobile.
- Zgodność z API: wszystkie akcje mapowane 1:1 do planu API, w tym „dual‑stream save” dla AI (oddzielne zapytania dla `ai_full` i `ai_edited`), batching ocen nauki, wirtualny deck „Nieprzypisane”.

## 2. Lista widoków

### Widok: Dashboard (Lista decków)
- Ścieżka: `/`
- Główny cel: Szybki przegląd decków, wejście do nauki, dostęp do „Nieprzypisane”.
- Kluczowe informacje:
  - Kafel „Nieprzypisane” (jeśli istnieją fiszki bez decku) z licznikiem.
  - Lista decków użytkownika z `flashcard_count`.
  - Empty states: brak decków / brak fiszek.
- Kluczowe komponenty:
  - `DeckCard` (nazwa, licznik, akcje: Otwórz, Ucz się), `VirtualDeckCard` dla „Nieprzypisane”.
  - `CreateDeckDialog` (nazwa, walidacja 1–30 znaków, unikalność per user).
  - `Toast`, `InlineError`, `SkeletonList`.
- UX/A11Y/Sec:
  - CTA „Stwórz pierwszy deck” przy braku decków i generuj z AI przy stworzonych deckach i braku fiszek.
  - Ikony źródeł fiszek (AI/Manual) opcjonalnie w szczegółach decku.
  - Dane ładowane z: `GET /api/decks`, licznik „Nieprzypisane” z `GET /api/flashcards?unassigned=true`.

### Widok: Generator AI
- Ścieżka: `/generator`
- Główny cel: Wklejenie tekstu (1000–10000 znaków), generacja propozycji fiszek, przegląd/edycja, zapis do wybranego decku (lub bez decku).
- Kluczowe informacje:
  - Pole textarea z licznikami i walidacją zakresu.
  - Propozycje fiszek (efemeryczne w pamięci): lista edytowalna.
  - Wybór decku docelowego do zapisu zaakceptowanych.
  - Limit dzienny generacji (badge).
- Kluczowe komponenty:
  - `AIInputForm` (textarea, licznik znaków, przycisk „Generuj” z blokadą).
  - `GenerationSkeleton` (blokujący, brak anulowania w MVP).
  - `AIProposalRow` (front/back jako pola tekstowe, znaczniki: zaakceptowana/odrzucona, wskaźniki źródła).
  - `DeckSelect` (docelowy deck), przyciski „Zapisz zaakceptowane”, "Zapisz wszystkie".
  - `Toast`, `InlineError`, `PartialSaveAlert`.
- UX/A11Y/Sec:
  - Obsługa 429: badge „Pozostało X/10”, blokada „Generuj” przy braku limitu.
  - Dual‑stream save: rozdzielenie zapisów na `ai_full` (nieedytowane) i `ai_edited` (edytowane).
  - Częściowy błąd zapisu: zapisane znikają z listy, niezapisane zostają do ponownej próby.
  - API: `GET /api/generations/limits`, `POST /api/generations`, `POST /api/flashcards` (2 równoległe wywołania), `PATCH /api/generations/:sessionId/accepted`.

### Widok: Wirtualny deck „Nieprzypisane”
- Ścieżka: `/decks/unassigned`
- Główny cel: Przegląd i przypisywanie pojedynczych fiszek do decków.
- Kluczowe informacje:
  - Lista fiszek `deck_id = null`.
  - Brak akcji „Ucz się”.
- Kluczowe komponenty:
  - `FlashcardItem` (plain text, źródło z ikoną).
  - `DeckAssignDropdown` (zmiana decku per fiszka → `PATCH`).
  - `LoadMoreButton` / „infinite scroll”.
- UX/A11Y/Sec:
  - Po udanym przypisaniu element znika z listy (po re-fetch).
  - API: `GET /api/flashcards?unassigned=true`, `PATCH /api/flashcards/:id` (zmiana `deck_id`), błędy 404/401 inline.

### Widok: Szczegóły decku
- Ścieżka: `/decks/:id`
- Główny cel: Lista fiszek w decku, edycja/usuń, start nauki, reset postępu.
- Kluczowe informacje:
  - Nazwa decku, licznik fiszek.
  - Lista fiszek z paginacją/„Load more”.
- Kluczowe komponenty:
  - `DeckHeader` (nazwa, akcje: Edytuj nazwę, Usuń deck, Reset postępu, Start nauki).
  - `FlashcardList` z `FlashcardItem` (edycja jako dialog).
  - `ConfirmDialog` (usuń deck, reset postępu, usuń fiszkę).
  - `Toast`, `InlineError`.
- UX/A11Y/Sec:
  - Edycja fiszki zmienia `source` z `ai_full` na `ai_edited` po zapisie (automatyczne w API).
  - API: `GET /api/decks/:id`, `GET /api/flashcards?deck_id=:id`, `PATCH /api/flashcards/:id`, `DELETE /api/flashcards/:id`, `PATCH /api/decks/:id`, `DELETE /api/decks/:id`, `POST /api/decks/:id/reset-progress`.

### Widok: Dodawanie manualne
- Ścieżka: `/manual`
- Główny cel: Ręczne tworzenie pojedynczych (lub wielu) fiszek.
- Kluczowe informacje:
  - Wybór decku (opcjonalnie puste → „Nieprzypisane”).
  - Pola front/back z licznikami (1-200/1-500).
- Kluczowe komponenty:
  - `ManualFlashcardForm` (możliwość dodania kilku wierszy).
  - `DeckSelect`, `SubmitButton`.
  - `Toast`, `InlineError`.
- UX/A11Y/Sec:
  - Walidacja inline, komunikaty błędów przy polach.
  - API: `POST /api/flashcards` (`source = 'manual'`, `generation_id = null`).

### Widok: Tryb nauki
- Ścieżka: `/learn/:deckId`
- Główny cel: Sesja nauki z prostą oceną (OK/NOK), buforowaniem i podsumowaniem.
- Kluczowe informacje:
  - Pasek postępu (np. 40/50), liczba due.
  - Karta: przód → po akcji ujawnia tył.
  - Po zakończeniu sesji nauki (np. 50/50) pojawia się opcja kontynuacji (nowa generacja fiszek do nauki) lub powrotu do widoku decków
- Kluczowe komponenty:
  - `StudyCard` (front/back, przełączanie), `ReviewControls` (OK/NOK).
  - `ProgressBar`, `SessionCounter`, `SummaryScreen`.
  - Bufor lokalny ocen i wysyłka paczkami (np. co 10).
- UX/A11Y/Sec:
  - Nawigacja główna pozostaje widoczna.
  - Odświeżenie resetuje sesję (stan lokalny).
  - API: `GET /api/learn/:deckId?limit=...`, `PATCH /api/learn/review` (batched).

### Widoki: Autoryzacja
- Ścieżki: `/auth/login`, `/auth/register`
- Główny cel: Logowanie/rejestracja do uzyskania tokenu (Supabase Auth).
- Kluczowe komponenty:
  - `AuthForm` (email, hasło, potwierdzenie hasła w rejestracji).
  - `InlineError`, `Toast`.
- UX/A11Y/Sec:
  - Po sukcesie redirect do `/`.
  - Błędy 401 prezentowane jasno, brak wycieku szczegółów.

## 3. Mapa podróży użytkownika

### A. Generowanie AI (główny przypadek użycia)
1) Dashboard → „Generator AI”.  
2) Użytkownik wkleja tekst (1000–10000), widzi licznik znaków; w tle `GET /api/generations/limits` i blokada przycisku jeśli limit przekroczony
3) Klik „Generuj”: przycisk zablokowany, skeleton loading; `POST /api/generations`.  
4) Po sukcesie: przejście do „Review Mode” (na tej samej stronie), lista propozycji (edytowalne).  
5) Użytkownik akceptuje/odrzuca, edytuje wybrane; wybiera deck docelowy.  
6) „Zapisz zaakceptowane”: dwa równoległe `POST /api/flashcards` (ai_full vs ai_edited), a następnie `PATCH /api/generations/:sessionId/accepted`.  
7) Częściowy błąd: zapisane znikają, niezapisane pozostają; UI wyświetla toast i inline errors.  
8) Po pełnym sukcesie: toast „Zapisano”, wyczyszczenie pola generacji i odblokowanie przycisku generuj.

Powiązane user stories: US‑007, US‑008.

### B. Dodawanie manualne
1) Dashboard/Deck → „Dodaj fiszkę” lub `/manual`.  
2) Uzupełnienie front/back (+ licznik), wybór decku lub puste (→ „Nieprzypisane”).  
3) Submit: `POST /api/flashcards` (`source='manual'`).  
4) Toast sukcesu.

Powiązane: US‑009, US‑010, US‑011.

### C. Zarządzanie deckiem
1) Dashboard → wybór decku → `/decks/:id`.  
2) Lista fiszek (edycja/usuń), zmiana nazwy decku, reset postępu, start nauki.  
3) Akcje: `PATCH/DELETE /api/flashcards/:id`, `PATCH/DELETE /api/decks/:id`, `POST /api/decks/:id/reset-progress`.  
4) Potwierdzenia w dialogach, toasty po sukcesie.

Powiązane: US‑004, US‑005, US‑006, US‑014, US‑015.

### D. „Nieprzypisane”
1) Dashboard → „Nieprzypisane” (`/decks/unassigned`).  
2) Lista fiszek z dropdownem „Przypisz do decku”.  
3) `PATCH /api/flashcards/:id` z nowym `deck_id`; element znika po sukcesie.  
4) Brak akcji „Ucz się”.

### E. Nauka
1) Deck → „Ucz się” → `/learn/:deckId`.  
2) `GET /api/learn/:deckId` (limit domyślnie 50), UI pokazuje front → akcja → tył.  
3) Użytkownik ocenia OK/NOK; oceny buforowane lokalnie i wysyłane `PATCH /api/learn/review` paczkami (np. co 10).  
4) Ekran podsumowania: statystyka sesji, przyciski „Kontynuuj” lub „Powrót do decku”.  
5) Odświeżenie resetuje sesję (świadoma decyzja w MVP).

Powiązane: US‑012, US‑013.

### F. Autoryzacja
1) `/auth/register` → walidacja pól → sukces: automatyczne zalogowanie i redirect do `/`.  
2) `/auth/login` → sukces: redirect do `/`.  
3) „Wyloguj” w nawigacji.

Powiązane: US‑001, US‑002, US‑003.

## 4. Układ i struktura nawigacji

- AppShell (stały): 
  - Header: logo/nazwa, linki: „Dashboard”, „Generator AI”, „Dodaj manualnie”.  
  - Prawa strona: przycisk „Wyloguj”.
  - Mobile: hamburger → Drawer z tymi samymi linkami, focus trap, aria‑labelling.
- Nawigacja pozostaje widoczna w trybie nauki (zgodnie z decyzjami).
- Guardy tras:
  - Trasy chronione wymagają tokenu; brak → redirect do `/auth/login`.
- Stany globalne UI:
  - Toasty w rogu, kolejka zdarzeń.
  - Dialogi potwierdzeń modalne (focus management, ESC).

## 5. Kluczowe komponenty

- AppShell
  - `Header`, `NavLinks`, `MobileDrawer`, `AuthStatus`, `LimitBadge`.
- Decks
  - `DeckCard`, `VirtualDeckCard`, `CreateDeckDialog`, `RenameDeckDialog`, `DeleteDeckDialog`, `ResetProgressDialog`.
- Flashcards
  - `FlashcardItem` (read‑only), `FlashcardEditorRow` (front/back, liczniki, plain text, źródło), `FlashcardList` (paginacja/„Load more”), `DeckAssignDropdown`, `LoadMoreButton`.
- AI Generator
  - `AIInputForm` (textarea + licznik, walidacja), `GenerationSkeleton`, `AIProposalRow`, `DeckSelect`, `SaveAcceptedButton`, `PartialSaveAlert`.
- Nauka
  - `StudyCard` (front/back, animacje kontrolowane), `ReviewControls` (OK/NOK), `ProgressBar`, `SessionCounter`, `SummaryScreen`.
- Formularze i feedback
  - `InlineError`, `FormHelperText`, `Toast`, `ConfirmDialog`, `EmptyState`, `ErrorState`.
- Skeletony
  - `ListSkeleton`, `CardSkeleton`, `TextSkeleton` (odwzorowują układ docelowy).

Względy A11Y/UX/Sec w komponentach:
- Wszystkie pola formularzy z etykietami, `aria-describedby` do błędów.
- Przyciski z czytelnymi etykietami, stanami `aria-busy` podczas blokad.
- Brak renderowania HTML/Markdown w treściach fiszek; zawsze plain text z `white-space: pre-wrap`.
- Obsługa 401/403/404/409/429:
  - 401/403: redirect/logiczny guard + komunikat.
  - 404: EmptyState z akcją powrotu.
  - 409: błędy walidacji (np. nazwa decku), inline.
  - 429: badge limitu + blokada CTA, tooltip wyjaśniający.

Zgodność z PRD i planem API (mapowanie skrótowe):
- Decki: CRUD, licznik fiszek, reset postępu → widoki Dashboard/Deck Detail.
- Fiszki: manualne dodawanie/edycja/usuwanie, „Nieprzypisane” → Manual/Unassigned/Deck Detail.
- AI: generowanie synchroniczne, review+edycja, dual‑stream save, limit dzienny → Generator AI.
- Nauka: prosta ocena, batching, podsumowanie, licznik postępu → Tryb nauki.
- Autoryzacja: logowanie/rejestracja/wylogowanie → Auth.


