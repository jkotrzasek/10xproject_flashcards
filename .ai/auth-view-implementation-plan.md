## Plan implementacji widoku Autoryzacja (wersja szkieletowa)

## 1. Przegląd

Widok „Autoryzacja” obejmuje dwie strony: logowania (`/auth/login`) i rejestracji (`/auth/register`). W tej iteracji implementujemy wyłącznie statyczny, wizualny szkielet tych stron: nagłówki, opisy, nieaktywne pola formularza i przyciski, bez jakiejkolwiek logiki, walidacji, integracji z API ani możliwości wpisywania danych. Celem jest przygotowanie layoutu i hierarchii komponentów tak, aby w kolejnych etapach można było łatwo dodać właściwe zachowanie (Supabase Auth, walidację, obsługę błędów).

## 2. Routing widoku

Widok autoryzacji składa się z dwóch stron Astro:

- Strona logowania: ścieżka `/auth/login`, plik `src/pages/auth/login.astro`.
- Strona rejestracji: ścieżka `/auth/register`, plik `src/pages/auth/register.astro`.

Obie strony:

- Używają głównego layoutu aplikacji (np. `Layout.astro`), aby zachować wspólny `Header.astro` i tło aplikacji.
- Renderują wyspę React z głównym komponentem widoku, np. `AuthView`, z przekazanym trybem działania: `"login"` lub `"register"`.

Dodatkowo:

- W `Header.astro` jest przycisk/link „Zaloguj” prowadzący do `/auth/login`, widoczny zawsze (bez logiki rozpoznawania zalogowania).

## 3. Struktura komponentów

Główne komponenty i ich hierarchia dla szkieletu widoku autoryzacji:

- `LoginPage` (Astro, `src/pages/auth/login.astro`)
  - Odpowiada za routing `/auth/login`.
  - Osadza layout aplikacji i React island `AuthView` z `mode="login"`.
- `RegisterPage` (Astro, `src/pages/auth/register.astro`)
  - Odpowiada za routing `/auth/register`.
  - Osadza layout aplikacji i React island `AuthView` z `mode="register"`.
- `AuthView` (React island, `src/components/auth/AuthView.tsx`)
  - Kontener widoku autoryzacji, wspólny dla logowania i rejestracji.
  - Renderuje nagłówek, krótki opis i komponent `AuthForm`.
  - Wyświetla link do przejścia między logowaniem a rejestracją.
- `AuthForm` (React, `src/components/auth/AuthForm.tsx`)
  - Prezentacyjny formularz zawierający nieaktywne (disabled) pola e‑mail/hasło/potwierdzenie hasła (w rejestracji) oraz nieaktywny przycisk.
  - Nie posiada żadnych handlerów zdarzeń ani logiki walidacji – wszystkie kontrolki są tylko wizualnym szkieletem.
- `HeaderAuthButton` (fragment w `Header.astro`)
  - Link/przycisk „Zaloguj” w nagłówku aplikacji, prowadzący do `/auth/login`.

## 4. Szczegóły komponentów

### `LoginPage` (Astro)

- Opis komponentu: Strona routingu dla `/auth/login`. Ustawia tytuł strony (np. „Logowanie – AI Flashcards”), korzysta z globalnego layoutu i osadza React island `AuthView` w trybie `"login"`. Komponent nie zawiera żadnej logiki – jedynie markup i przekazanie trybu do React.
- Główne elementy:
  - `Layout` (np. `Layout.astro`) jako wrapper.
  - React island `<AuthView client:load mode="login" />`.
- Obsługiwane interakcje: Brak – całość jest statyczna, a logika zostanie dodana później.
- Obsługiwana walidacja: Brak.
- Typy:
  - Dopuszczalny prosty typ `AuthMode = "login" | "register"` używany wyłącznie jako typ propsa.
- Propsy:
  - `mode: "login"`.

### `RegisterPage` (Astro)

- Opis komponentu: Strona routingu dla `/auth/register`. Analogiczna do `LoginPage`, ale dla rejestracji. Wyświetla tę samą strukturę layoutu, z innymi tekstami i formularzem w trybie „rejestracja”.
- Główne elementy:
  - `Layout` z tytułem strony „Rejestracja – AI Flashcards”.
  - React island `<AuthView client:load mode="register" />`.
- Obsługiwane interakcje: Brak.
- Obsługiwana walidacja: Brak.
- Typy:
  - Ten sam `AuthMode` jak w `LoginPage`.
- Propsy:
  - `mode: "register"`.

### `AuthView` (React)

- Opis komponentu: Wspólny kontener dla widoku autoryzacji (logowanie/rejestracja). Na podstawie `mode` renderuje odpowiednie tytuły i opisy, a także statyczny formularz `AuthForm`. Zawiera również link pozwalający przełączyć się między stroną logowania a rejestracji (np. prosty `<a>`).
- Główne elementy:
  - Nagłówek sekcji (np. „Zaloguj się” / „Załóż konto”).
  - Krótki opis (np. jeden akapit wyjaśniający, że konto służy do zapisywania decków i fiszek).
  - `AuthForm` z odpowiednim `mode`.
  - Statyczny blok na ewentualne komunikaty (np. puste miejsce, gdzie kiedyś pojawi się informacja o błędach).
  - Link nawigacyjny:
    - na `/auth/login` jeśli `mode="register"`,
    - na `/auth/register` jeśli `mode="login"`.
- Obsługiwane interakcje:
  - Kliknięcie linku nawigacyjnego (standardowa nawigacja, bez dodatkowej logiki).
- Obsługiwana walidacja:
  - Brak.
- Typy:
  - `AuthMode = "login" | "register"`.
  - `AuthViewProps`:
    - `mode: AuthMode`.
- Propsy:
  - `mode: AuthMode`.

### `AuthForm` (React)

- Opis komponentu: Prezentacyjny formularz szkieletowy, pokazujący docelowy wygląd pól i przycisku, ale całkowicie nieaktywny. Użytkownik nie może nic wpisać (pola są `disabled` lub `readOnly`), przycisk jest wyłączony (`disabled`), nie ma zdefiniowanych handlerów `onChange`, `onSubmit` ani żadnej logiki.
- Główne elementy:
  - Pola formularza:
    - `input[type="email"]` z etykietą „E‑mail” i przykładowym placeholderem, ustawione `disabled`.
    - `input[type="password"]` dla hasła z etykietą „Hasło”, `disabled`.
    - `input[type="password"]` dla potwierdzenia hasła (tylko gdy `mode="register"`), `disabled`.
  - Miejsce na opis pomocniczy pod polami (np. krótkie zdanie tekstowe, bez logiki).
  - Miejsce na komunikat błędu globalnego (pusta sekcja, np. pusty `<p>` ze stylem błędu).
  - Przycisk:
    - Tekst „Zaloguj się” lub „Zarejestruj się” w zależności od `mode`.
    - Atrybut `disabled`, bez handlerów kliknięcia.
- Obsługiwane interakcje:
  - Brak – wszystkie kontrolki są nieaktywne.
- Obsługiwana walidacja:
  - Brak – brak Zod, brak atrybutów wymuszających walidację HTML5 (można dodać `aria-disabled` dla spójności a11y).
- Typy:
  - `AuthFormProps`:
    - `mode: AuthMode`.
- Propsy:
  - `mode: AuthMode`.

### `HeaderAuthButton` (w `Header.astro`)

- Opis komponentu: Fragment nagłówka odpowiadający za akcję „Zaloguj”. W tej wersji jest to wyłącznie link do `/auth/login`, zawsze widoczny, bez żadnej logiki rozpoznawania stanu użytkownika.
- Główne elementy:
  - `a[href="/auth/login"]` z tekstem „Zaloguj” i klasami Tailwind spójnymi z pozostałymi przyciskami w headerze.
- Obsługiwane interakcje:
  - Kliknięcie przenoszące użytkownika na `/auth/login`.
- Obsługiwana walidacja:
  - Brak.
- Typy:
  - Brak dedykowanych typów TS.
- Propsy:
  - Brak – statyczny link.

## 5. Typy

Na potrzeby szkieletowej wersji widoku wystarczają minimalne typy, opisujące tryb widoku i propsy komponentów React:

- `type AuthMode = "login" | "register";`
- `interface AuthViewProps { mode: AuthMode }`
- `interface AuthFormProps { mode: AuthMode }`

Nie są definiowane żadne typy związane z danymi użytkownika, błędami ani odpowiedziami API na tym etapie.

## 6. Zarządzanie stanem

W tej wersji widoku nie ma żadnego stanu aplikacyjnego:

- Brak lokalnego stanu formularza (pola są nieaktywne).
- Brak hooków (`useState`, `useEffect`, własnych hooków typu `useAuthForm`).
- Komponenty React są wyłącznie prezentacyjne – renderują przekazany `mode` i na jego podstawie dobierają teksty.

Zarządzanie stanem (wartości pól, błędy, loading, sesja użytkownika) zostanie dodane w kolejnych iteracjach.

## 7. Integracja API

Na tym etapie:

- Brak jakiejkolwiek integracji z Supabase Auth ani z własnymi endpointami `/api/...`.
- Nie są wykonywane żadne wywołania HTTP ani operacje na kliencie Supabase.

Widok pełni rolę czysto wizualnego szkieletu – później w te same komponenty zostanie wstrzyknięta logika autoryzacji.

## 8. Interakcje użytkownika

W szkieletowej wersji widoku:

- Użytkownik może:
  - przejść na `/auth/login` poprzez kliknięcie „Zaloguj” w nagłówku,
  - na stronie logowania kliknąć link do `/auth/register`,
  - na stronie rejestracji kliknąć link do `/auth/login`.
- Użytkownik nie może:
  - wpisywać danych w polach formularza (wszystkie są `disabled`/`readOnly`),
  - klikać aktywnego przycisku wysyłki (przycisk jest `disabled`),
  - wysyłać formularza ani wywoływać walidacji.

Interakcje ograniczają się wyłącznie do nawigacji między stronami.

## 9. Warunki i walidacja

W tej iteracji:

- Nie ma żadnych warunków biznesowych, które muszą być spełnione na poziomie widoku.
- Nie ma walidacji pól formularza (ani po stronie klienta, ani HTML5).
- Widok nie weryfikuje stanu zalogowania użytkownika (brak guardów, brak przekierowań zależnych od sesji).

W przyszłości w tym miejscu zostaną opisane reguły walidacji zgodne z PRD (US‑001, US‑002), ale teraz pozostają poza zakresem implementacji.

## 10. Obsługa błędów

Wersja szkieletowa nie obsługuje żadnych błędów, ponieważ:

- Formularz nie wysyła danych i nie komunikuje się z API.
- Nie są prezentowane żadne komunikaty o błędach logicznych ani sieciowych.

Można jedynie przewidzieć w układzie miejsce (np. pusty blok tekstowy) na przyszłe komunikaty błędów globalnych, ale pozostaje ono puste i nieaktywne.

## 11. Kroki implementacji

1. Utworzenie stron routingu Astro  
   - Dodać pliki `src/pages/auth/login.astro` oraz `src/pages/auth/register.astro`.  
   - W obu stronach użyć głównego layoutu (`Layout.astro`) i osadzić React island `AuthView` z odpowiednim `mode`.  
   - Ustawić tytuły stron (np. poprzez propsy do layoutu).

2. Implementacja `AuthView`  
   - Utworzyć `src/components/auth/AuthView.tsx`.  
   - Na podstawie propsa `mode` wyrenderować odpowiedni nagłówek, opis, link do przeciwnej strony (`/auth/login` ↔ `/auth/register`) oraz komponent `AuthForm`.  
   - Zastosować Tailwind i komponenty z shadcn/ui tak, aby layout był spójny z resztą aplikacji (np. centralne pudełko, maksymalna szerokość, odstępy).

3. Implementacja `AuthForm` jako szkieletu  
   - Utworzyć `src/components/auth/AuthForm.tsx`.  
   - Na podstawie `mode` wyrenderować:
     - zawsze: pola e‑mail i hasło (`input` z atrybutem `disabled` lub `readOnly`),  
     - tylko w rejestracji: dodatkowe pole „Potwierdź hasło”, również `disabled`,  
     - nieaktywny przycisk (również `disabled`).  
   - Nie dodawać żadnych handlerów (`onChange`, `onSubmit`), nie korzystać z hooków.  
   - Ustawić sensowne placeholdery, aby pokazać docelowy wygląd, ale bez funkcjonalności.

4. Aktualizacja `Header.astro`  
   - Dodać w nagłówku link/przycisk „Zaloguj” prowadzący do `/auth/login`, korzystając ze stylów spójnych z istniejącymi przyciskami.  

5. Przegląd wizualny  
   - Sprawdzić responsywność (układ na mobile/desktop).  
   - Upewnić się, że wszystkie elementy formularza są wyraźnie nieaktywne (np. wizualnie przygaszone) i że nie można w nich pisać.  
   - Zweryfikować, że nawigacja pomiędzy `/auth/login` i `/auth/register` działa poprzez linki, a pozostałe elementy są wyłącznie statyczne.

