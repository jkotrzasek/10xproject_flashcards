## Specyfikacja modułu autentykacji (US-001, US-002, US-003)

Słowa kluczowe: **Astro 5**, **React 19**, **Supabase Auth**, **Node adapter (output: "server")**, **RLS**, **token-based auth**, **SSR + middleware**, **formularze React**, **Zod**, **API `/api/*`**.

Dokument opisuje docelową architekturę modułu rejestracji, logowania, wylogowania i odzyskiwania hasła, zgodną z:
- wymaganiami PRD (sekcja „System kont użytkowników” oraz historyjki **US-001–US-003**),
- planem API (sekcja „Authentication and Authorization”, gdzie _„User authenticate via `/auth/login` or `/auth/register`, receiving a bearer token”_),
- stackiem technologicznym i regułami dla Astro/React/Supabase.

---

## 1. Architektura interfejsu użytkownika

### 1.1. Tryby aplikacji: auth vs non-auth

Wprowadzamy dwa logiczne tryby aplikacji, odzwierciedlone w layoutach Astro:

- **Tryb non-auth (publiczny)**
  - W wersji **MVP** jedynym widokiem dostępnym dla niezalogowanego użytkownika jest panel logowania (`/auth/login`) z komunikatem: **„Witaj ponownie, zaloguj się, aby zobaczyć swoje zasoby.”**.
  - Z panelu logowania użytkownik może przełączać się na widoki rejestracji nowego konta oraz odzyskiwania hasła (jako dodatkowe stany tego samego modułu auth), ale **nie istnieją publiczne strony landing/marketingowe**.
  - Użytkownik niezalogowany **nie ma dostępu** do zasobów wymagających konta (decki, fiszki, nauka, generacje AI) ani do żadnych innych ekranów aplikacji poza modułem auth.

- **Tryb auth (prywatny)**
  - Panel główny użytkownika (lista decków, generowanie fiszek AI, nauka, statystyki).
  - Wszelkie widoki korzystające z endpointów `/api/decks`, `/api/flashcards`, `/api/learn`, `/api/generations`, itp.
  - Wspólny nagłówek z informacją o użytkowniku i przyciskiem **„Wyloguj”** (US-003).

Rozdzielenie trybów odbywa się **server-side** (middleware + layouty), tak aby nie polegać wyłącznie na ochronie po stronie klienta.


### 1.2. Layouty Astro

Nowe/rozszerzone layouty (nazwy przykładowe, mogą zostać dostosowane do istniejącej struktury):

- **`src/layouts/AuthLayout.astro`**
  - Używany przez strony `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password`.
  - Cechy:
    - Minimalistyczny layout formularzowy (środek ekranu, karta z formularzem, logo, krótkie copy).
    - Brak bocznej nawigacji, brak elementów wymagających autentykacji.
    - Linki pomocnicze: przejście między logowaniem a rejestracją, link „Nie pamiętasz hasła?”.
    - Dostosowanie do View Transitions / ClientRouter (płynne przejścia między `/auth/*`).

- **`src/layouts/AppLayout.astro`**
  - Używany przez strony wymagające logowania (np. dashboard, listy decków, widok nauki, generowanie AI).
  - Cechy:
    - Górny pasek nawigacji z nazwą aplikacji, linkami do głównych modułów i **menu użytkownika** (adres e-mail, przycisk „Wyloguj”).
    - Lewa nawigacja (opcjonalnie) z sekcjami: „Decki”, „Nauka”, „Generowanie AI”, „Historia generacji”.
    - W treści layoutu wstrzykiwane są React komponenty odpowiedzialne za logikę decków/fiszek (zachowujemy istniejącą strukturę, jedynie uzupełniając o wymóg autentykacji).

**Zasada:** layout jest odpowiedzialny wyłącznie za **ramę UI** i odczytanie z `Astro.locals` informacji o użytkowniku (np. `locals.user?.email`), natomiast żadne żądania HTTP nie są wykonywane w layoucie.


### 1.3. Strony Astro w module auth

Ścieżki UI (GET) – strony dostarczające HTML i osadzające formularze React.

1. **`src/pages/auth/login.astro`**
   - Cel biznesowy: realizacja **US-002** („Logowanie do systemu”).
   - Odpowiedzialność:
     - SSR: sprawdza w `Astro.locals.user`, czy użytkownik jest już zalogowany; jeśli tak – **redirect do panelu głównego** (np. `/app`), aby nie pokazywać formularza zalogowanym.
     - Renderuje `AuthLayout` z osadzonym React komponentem `LoginForm`.
     - Ustawia meta/SEO (tytuł „Logowanie – 10xproject Flashcards”).
     - Wyświetla stały komunikat powitalny: **„Witaj ponownie, zaloguj się, aby zobaczyć swoje zasoby.”** (wymóg MVP dla widoku niezalogowanego).

2. **`src/pages/auth/register.astro`**
   - Cel biznesowy: realizacja **US-001** („Rejestracja nowego użytkownika”).
   - Odpowiedzialność:
     - SSR: analogicznie jak login – redirect do `/app` gdy `user` istnieje.
     - Renderuje `AuthLayout` z komponentem `RegisterForm`.

3. **`src/pages/auth/forgot-password.astro`**
   - Cel biznesowy: „odzyskiwanie hasła” (nieopisane w osobnej historyjce, ale wymagane w zadaniu; rozszerza sekcję „System kont użytkowników”).
   - Odpowiedzialność:
     - Dostarcza formularz z jednym polem e-mail (React: `ForgotPasswordForm`).
     - Po wysłaniu formularza prezentuje komunikat sukcesu niezależnie od tego, czy podany e-mail istnieje (ochrona przed enumeracją kont).

4. **`src/pages/auth/reset-password.astro`**
   - Cel biznesowy: finalizacja procesu resetu hasła po kliknięciu w link z e-maila Supabase.
   - Odpowiedzialność:
     - Odczyt parametrów URL (np. `code`/`token` przekazany przez Supabase lub użycie sesji automatycznie ustanowionej przez Supabase po kliknięciu linku).
     - Renderuje `AuthLayout` z React komponentem `ResetPasswordForm` (pola: nowe hasło + potwierdzenie).
     - W przypadku braku/niepoprawności tokenu pokazuje komunikat błędu i link powrotny do `/auth/forgot-password`.

5. **Istniejące strony aplikacji (np. `src/pages/index.astro`, `src/pages/app/*.astro`, `src/pages/decks/*.astro`, `src/pages/learn/*.astro`)**
   - Aktualizacja odpowiedzialności:
     - Zamiast lokalnie sprawdzać, czy użytkownik jest zalogowany (np. w React), korzystają z informacji dostarczonej przez middleware (`Astro.locals.user`).
     - Dla stron wymagających logowania – w przypadku braku użytkownika wykonują **server-side redirect do `/auth/login`**.
     - W wersji MVP **nie przewidujemy osobnych stron publicznych (landing/marketing)**; przykładowo `/` (`index.astro`) powinien zachowywać się jak wejście do modułu auth (np. redirect do `/auth/login`). Publiczny landing może zostać dodany dopiero poza MVP.


### 1.4. Komponenty React – formularze i UI auth

Komponenty React są odpowiedzialne za **stan formularza, walidację po stronie klienta, obsługę interakcji i wywołania API**. Astro odpowiada tylko za osadzenie komponentu i SSR.

Proponowana struktura:
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`
- `src/components/auth/ForgotPasswordForm.tsx`
- `src/components/auth/ResetPasswordForm.tsx`
- `src/components/auth/AuthErrorBanner.tsx` (wspólny komponent komunikatów błędów)
- `src/components/auth/hooks/useAuthApi.ts` (klient API dla auth)

#### 1.4.1. `LoginForm`

- Pola:
  - `email`
  - `password`
- Zachowanie:
  - Walidacja po stronie klienta (format e-mail, niepuste hasło).
  - Po submitcie wysyła `POST` do **`/api/auth/login`** przez hook `useAuthApi`.
  - Obsługa odpowiedzi:
    - Sukces: zapis stanu zalogowania w warstwie klienta (np. Context) i **redirect na panel główny** (np. `/app`), realizując akceptację: „Po podaniu poprawnych danych jestem przekierowany do panelu głównego” (US-002).
    - Błąd 401: komunikat „Nieprawidłowy e-mail lub hasło”.
    - Inne błędy (400, 500): ogólny komunikat „Nie udało się zalogować. Spróbuj ponownie później”, z opcją rozwinięcia szczegółów dla zaawansowanych.
  - UI: komponenty Shadcn/ui (`<Input>`, `<Button>`, `<Form>`, `<FormField>`), wykorzystanie Tailwind do układu.

#### 1.4.2. `RegisterForm`

- Pola:
  - `email`
  - `password`
  - `passwordConfirmation`
- Zachowanie:
  - Walidacja klienta:
    - e-mail w poprawnym formacie,
    - hasło o minimalnej długości (np. 8 znaków) i prostych zasadach złożoności,
    - `password === passwordConfirmation`.
  - Po submitcie: `POST /api/auth/register`.
  - Obsługa odpowiedzi:
    - Sukces: automatyczne zalogowanie (sesja Supabase) i **redirect do panelu głównego** (US-001: „Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do panelu głównego”).
    - Błąd 409: e-mail już zajęty – komunikat „Konto z tym adresem e-mail już istnieje”.
    - Błędy walidacji (400): wyróżnienie odpowiednich pól, wyświetlenie komunikatów inline.

#### 1.4.3. `ForgotPasswordForm`

- Pola:
  - `email`
- Zachowanie:
  - Walidacja klienta: poprawny format e-mail.
  - Po submitcie: `POST /api/auth/forgot-password`.
  - UI odpowiedzi:
    - Zawsze pokazuje neutralny komunikat w stylu: „Jeśli podany adres istnieje w systemie, wysłaliśmy instrukcję resetu hasła”.
    - Unikamy ujawniania, czy dany e-mail jest w bazie (bezpieczeństwo).

#### 1.4.4. `ResetPasswordForm`

- Pola:
  - `newPassword`
  - `newPasswordConfirmation`
- Zachowanie:
  - Walidacja klienta: minimalna długość, dopasowanie potwierdzenia.
  - Źródło tokenu/sesji:
    - Formularz zakłada, że przy wejściu na `/auth/reset-password` Supabase już ustanowił sesję (po kliknięciu linku z maila) **lub** że w URL znajduje się `access_token`/`code`, który komponent przekaże do API.
  - Po submitcie: `POST /api/auth/reset-password` (z tokenem, jeśli wymagany przez backendową strategię).
  - Odpowiedź:
    - Sukces: komunikat „Hasło zostało zmienione. Możesz się zalogować”, link do `/auth/login`.
    - Błąd (np. przeterminowany token): komunikat „Link do resetu hasła wygasł lub jest nieprawidłowy”, link powrotny do `/auth/forgot-password`.


### 1.5. Integracja formularzy React z backendem i nawigacją

- **Hook `useAuthApi`**
  - Odpowiedzialny za wywołania:
    - `login(credentials) → POST /api/auth/login`
    - `register(payload) → POST /api/auth/register`
    - `logout() → POST /api/auth/logout`
    - `requestPasswordReset(email) → POST /api/auth/forgot-password`
    - `resetPassword(data) → POST /api/auth/reset-password`
  - Zapewnia spójną obsługę stanu ładowania (`isLoading`), błędów (`error`), zgodnie z podejściem użytym już w `useLearnApi`.
  - Przyszłościowo może być bazą do globalnego hooka `useAuthenticatedFetch` używanego również w deckach/fiszkach/AI.

- **Nawigacja po sukcesie**
  - Zarządzana na poziomie komponentów formularzy (np. `useNavigate()` z ClientRoutera Astro lub `window.location.assign` przy SSR-first).
  - Rejestracja/logowanie: redirect do `/app` (lub innej strony głównej użytkownika).
  - Logout: redirect do `/auth/login`.

- **Obsługa odpowiedzi 401 z istniejących hooków (`useLearnApi`, hooki decków/fiszek)**
  - Wprowadzenie wspólnej logiki: gdy `fetch` do `/api/*` zwróci `401 Unauthorized`, aplikacja:
    - czyści lokalny stan użytkownika (Context/auth store),
    - przekierowuje do `/auth/login` z informacją „Sesja wygasła, zaloguj się ponownie”.
  - To zachowanie nie jest zakodowane w tym dokumencie, ale moduł auth musi je przewidzieć (np. wspólny helper `handleApiError`).


### 1.6. Walidacja i komunikaty błędów – warstwa UI

- **Poziom 1 – natychmiastowa walidacja klienta**
  - Sprawdzenie formatów (e-mail), prostych reguł (długość hasła, dopasowanie pól) przed wywołaniem API.
  - Komunikaty przy polach (np. pod inputem) w przyjaznym języku.

- **Poziom 2 – walidacja backendowa**
  - Gdy API zwróci `400 Bad Request` z listą błędów walidacji, formularz:
    - mapuje błędy do konkretnych pól, jeśli to możliwe,
    - w przeciwnym razie wyświetla ogólny komunikat w `AuthErrorBanner`.

- **Poziom 3 – błędy systemowe**
  - Błędy Supabase lub serwera (5xx) są prezentowane jako ogólny komunikat „Coś poszło nie tak. Spróbuj ponownie.”, bez ujawniania szczegółów technicznych.
  - Szczegóły mogą być logowane po stronie backendu.


### 1.7. Kluczowe scenariusze UI

1. **Rejestracja nowego użytkownika (US-001)**
   - Użytkownik przechodzi na `/auth/register`.
   - Wypełnia e-mail i dwa pola hasła.
   - Klient weryfikuje format e-mail i zgodność haseł.
   - Po sukcesie rejestracji API zwraca sesję, UI przekierowuje do `/app`.

2. **Rejestracja z używanym e-mailem**
   - Ten sam przepływ, Supabase zwraca błąd unikalności.
   - Backend mapuje to na `409 Conflict` + `code: "EMAIL_ALREADY_REGISTERED"`.
   - UI wyświetla komunikat nad formularzem oraz oznacza pole e-mail jako błędne.

3. **Logowanie poprawne (US-002)**
   - `/auth/login`, poprawne dane → `POST /api/auth/login` → sesja + redirect do `/app`.

4. **Logowanie błędne**
   - Niepoprawny e-mail/hasło → `401 Unauthorized` + `code: "INVALID_CREDENTIALS"`.
   - UI pokazuje komunikat bez wskazywania, które pole jest błędne („dla bezpieczeństwa”).

5. **Wylogowanie (US-003)**
   - Użytkownik klika „Wyloguj” w nagłówku (komponent `UserMenu` w `AppLayout`).
   - Akcja wywołuje `POST /api/auth/logout`.
   - Po sukcesie: redirect na `/auth/login`, wyczyszczony lokalny stan.

6. **Reset hasła – cały przepływ**
   - Użytkownik z ekranu logowania klika „Nie pamiętasz hasła?”.
   - `/auth/forgot-password` → wprowadza e-mail → `POST /api/auth/forgot-password`.
   - Otrzymuje e-mail z linkiem (Supabase) do `/auth/reset-password?...`.
   - Po kliknięciu otwiera się `ResetPasswordForm`, który pozwala ustawić nowe hasło.
   - Po sukcesie wyświetlany jest link „Przejdź do logowania”.

---

## 2. Logika backendowa

### 2.1. Ogólna architektura backendu

Zgodnie z regułami projektu:
- Backend oparty jest o **Supabase (PostgreSQL + Auth)**.
- Aplikacja Astro działa w trybie **`output: "server"`** z adapterem Node (`mode: "standalone"`).
- API jest zaimplementowane jako **Server Endpoints** w `src/pages/api/*.ts`, z użyciem handlerów `GET`, `POST`, `PATCH`, `DELETE` (uppercase) i **Zod** do walidacji.
- Supabase jest udostępniany w **`context.locals`** (middleware) i w endpointach używamy wyłącznie `locals.supabase`, zgodnie z regułą:
  - „Use supabase from context.locals in Astro routes instead of importing supabaseClient directly”.


### 2.2. Modele danych i typy (warstwa aplikacyjna)

Baza danych dla autentykacji jest zarządzana przez **Supabase Auth** (`auth.users`). Moduł auth definiuje jedynie **DTO** i kontrakty API w `src/types.ts` lub osobnym pliku typu `src/types.auth.ts` (następnie re-eksportowane).

Na potrzeby tego dokumentu wystarczy założenie, że:
- requesty zawierają standardowe pola (`email`, `password`, opcjonalnie `password_confirmation` lub `token`),
- odpowiedzi zwracają minimalne dane o użytkowniku oraz tokenach sesyjnych,
- struktury błędów zawierają `code`, `message` i opcjonalne szczegóły.

Szczegółowe definicje typów (np. `LoginRequestDto`, `LoginResponseDto`) powstaną w `src/types.ts` podczas implementacji i będą współdzielone między frontendem (formularze React) i backendem (endpointy Astro).


### 2.3. Endpointy API dla autentykacji

Dla spójności z istniejącym planem REST (`/api/decks`, `/api/flashcards`, itd.) oraz wzmianką z sekcji „Authentication Mechanism” (_„User authenticate via `/auth/login` or `/auth/register`, receiving a bearer token”_), przyjmujemy następujące rozwiązanie:

- **UI / strony formularzy:** `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/reset-password` (Astro + React).
- **API JSON:** `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/forgot-password`, `/api/auth/reset-password`.

Formularze `/auth/*` korzystają wewnętrznie z `/api/auth/*`. Z punktu widzenia produktu użytkownik „loguje się przez /auth/login”, ale technicznie POST idzie na `/api/auth/login`.

#### 2.3.1. `POST /api/auth/register`

- **Opis:** Rejestracja nowego użytkownika (US-001).
- **Body:** `RegisterRequestDto`.
- **Walidacja (Zod):**
  - `email`: poprawny format (`z.string().email()`).
  - `password`: minimalna długość (np. 8), opcjonalnie wymagania dot. złożoności.
  - `password_confirmation`: wymagane, musi się równać `password`.
- **Logika:**
  1. Parsowanie i walidacja body (Zod).
  2. Wywołanie `locals.supabase.auth.signUp({ email, password })`.
  3. Obsługa błędów Supabase:
     - jeśli e-mail już istnieje → `409 Conflict` + `code: "EMAIL_ALREADY_REGISTERED"`.
     - inne błędy → `500 Internal Server Error` z przyjaznym komunikatem.
  4. Po sukcesie:
     - jeśli Supabase zwraca sesję (`session`):
       - zapisujemy tokeny w **HttpOnly cookies** (`access_token`, `refresh_token`) przy pomocy `Astro.cookies` (flagi: `secure`, `sameSite: "lax"`).
       - zwracamy `201 Created` z `LoginResponseDto` (user + tokeny), aby frontend mógł utworzyć ewentualny stan klienta.
     - jeśli Supabase wymaga potwierdzenia e-mail (opcjonalne, do decyzji produktowej): odpowiednio komunikujemy w UI.

#### 2.3.2. `POST /api/auth/login`

- **Opis:** Logowanie użytkownika (US-002).
- **Body:** `LoginRequestDto`.
- **Walidacja:**
  - `email`: poprawny format.
  - `password`: niepuste.
- **Logika:**
  1. Walidacja body.
  2. `locals.supabase.auth.signInWithPassword({ email, password })`.
  3. Obsługa błędów:
     - błędne dane → `401 Unauthorized` + `code: "INVALID_CREDENTIALS"`.
     - zbyt wiele prób (jeśli Supabase zwróci odpowiedni błąd) → potencjalnie `429 Too Many Requests`.
  4. Po sukcesie:
     - zapis sesji w HttpOnly cookies (`Astro.cookies`) w identyczny sposób jak w rejestracji.
     - zwrot `200 OK` z `LoginResponseDto`.

Zgodnie z planem API: klient może z odpowiedzi odczytać `access_token` i używać go jako **Bearer tokena** w nagłówku `Authorization` dla wywołań `/api/*`. Równocześnie użycie cookies pozwala middleware na SSR-owe rozpoznawanie użytkownika.

#### 2.3.3. `POST /api/auth/logout`

- **Opis:** Wylogowanie użytkownika (US-003).
- **Body:** brak.
- **Logika:**
  1. Odczyt sesji z cookies (przez `locals.supabase`).
  2. Wywołanie `locals.supabase.auth.signOut()`.
  3. Wyczyść cookies zawierające tokeny (`access_token`, `refresh_token`, ewentualne cookies Supabase).
  4. Zwróć `204 No Content`.

Frontend po otrzymaniu `204` czyści lokalny stan auth i przekierowuje do `/auth/login`.

#### 2.3.4. `POST /api/auth/forgot-password`

- **Opis:** Inicjacja resetu hasła (odzyskiwanie konta).
- **Body:** `ForgotPasswordRequestDto`.
- **Logika:**
  1. Walidacja formatu e-maila (Zod).
  2. Wywołanie `locals.supabase.auth.resetPasswordForEmail(email, { redirectTo })`, gdzie `redirectTo` wskazuje na publiczny adres `/auth/reset-password` (z odpowiednimi parametrami query).
  3. Zawsze zwróć `200 OK` z neutralnym komunikatem, nawet jeśli e-mail nie istnieje.
  4. Błędy techniczne Supabase → `500` z logowaniem w backendzie, ale ciągle przyjazny komunikat dla użytkownika.

#### 2.3.5. `POST /api/auth/reset-password`

- **Opis:** Ustawienie nowego hasła po kliknięciu w link z e-maila.
- **Body:** `ResetPasswordRequestDto`.
- **Strategia techniczna (przykładowa):**
  - W zależności od wybranego trybu Supabase:
    - **Tryb 1:** Po kliknięciu w link Supabase ustanawia sesję; endpoint może wywołać `locals.supabase.auth.updateUser({ password })` bez dodatkowego tokenu.
    - **Tryb 2:** Link zawiera `access_token`/`code`, który frontend przekazuje w body do endpointu; endpoint używa do tego specjalnego klienta lub admin API Supabase.
- **Walidacja:**
  - `password` i `password_confirmation` jak w rejestracji.
- **Logika:**
  1. Walidacja body.
  2. Weryfikacja, że istnieje aktualna sesja lub ważny token resetu.
  3. Wywołanie odpowiedniego endpointu Supabase do zmiany hasła.
  4. Sukces → `200 OK` z komunikatem typu „Hasło zostało zmienione”.
  5. Błędy (przeterminowany token, brak sesji) → `400 Bad Request` + `code: "RESET_TOKEN_INVALID_OR_EXPIRED"`.


### 2.4. Walidacja danych wejściowych – Zod

Wszystkie endpointy `/api/auth/*` używają osobnego modułu z walidacją, np. `src/lib/validation/authSchemas.ts`, gdzie definiowane są Zod schematy dla requestów.

Korzyści:
- Spójne komunikaty błędów.
- Możliwość wygenerowania typów TS z Zod (np. przez `z.infer`), współdzielonych z frontendem.

Błędy walidacji są mapowane na spójny format (`error.code`, `error.message`, opcjonalnie `error.details`), który frontend może wykorzystać do przypisania błędów do pól formularza; dokładny kształt struktur zostanie doprecyzowany na etapie implementacji.


### 2.5. Obsługa wyjątków i logowanie

- Każdy endpoint `/api/auth/*` jest opakowany w blok `try/catch`.
- Błędy dzielimy na kategorie:
  - **Błędy walidacji** → `400 Bad Request` (`VALIDATION_FAILED`).
  - **Błędy biznesowe/konflikty** (np. e-mail już istnieje) → `409 Conflict`.
  - **Błędy uwierzytelniania** → `401 Unauthorized` (`INVALID_CREDENTIALS`, `UNAUTHENTICATED`).
  - **Błędy uprawnień** (w przyszłości) → `403 Forbidden`.
  - **Błędy techniczne** → `500 Internal Server Error`.
- Dla logowania błędów (wewnętrznie) możemy wykorzystać serwis w `src/lib/services/logger.ts`, który:
  - loguje błąd z kontekstem (endpoint, user_id jeśli dostępny, payload bez wrażliwych danych),
  - w środowisku produkcyjnym pozwala na podłączenie zewnętrznego systemu logującego.


### 2.6. Aktualizacja renderowania server-side (zależność od `astro.config.mjs`)

Ponieważ projekt używa:
- `output: "server"`,
- adaptera Node w trybie standalone,

możemy konsekwentnie:

- **Wykonywać sprawdzanie sesji na serwerze** dla każdej strony i endpointu:
  - Strony `/auth/*` – jeśli jest aktywna sesja (`locals.user`), wykonują `redirect` na `/app`.
  - Strony aplikacji (np. `/app`, `/decks/*`, `/learn/*`) – jeśli brak sesji, `redirect` na `/auth/login`.

- **Korzystać z `Astro.cookies`** do ustawiania i czyszczenia ciasteczek sesyjnych w endpointach `/api/auth/*`.

- **W middleware** implementować logikę wspólną dla stron i API (patrz sekcja 3).

Dzięki temu zachowanie auth jest spójne i niezależne od tego, czy użytkownik wchodzi na stronę przez bezpośredni URL, czy w ramach nawigacji po aplikacji.

---

## 3. System autentykacji – integracja Supabase Auth z Astro

### 3.1. Warstwa middleware i Supabase w `locals`

Zgodnie z regułami backendu:
- Supabase ma być używany z `context.locals`.

Wprowadzamy/rozszerzamy middleware:

- **Plik:** `src/middleware/index.ts`.
- **Odpowiedzialność:**
  - Utworzenie per-request klienta Supabase (np. `createServerClient`) z użyciem klucza anon i URL-a z `import.meta.env`.
  - Wykorzystanie `Astro.cookies` jako `cookies` przekazywanych do Supabase, aby zarządzać sesją po stronie serwera.
  - Odczyt bieżącej sesji i użytkownika:
    - `const { data: { user } } = await supabase.auth.getUser()`.
  - Zapis do `locals`:
    - `locals.supabase` – klient Supabase z odpowiednio skonfigurowanymi cookies.
    - `locals.user` – obiekt z minimalnym zestawem danych o użytkowniku (id, email).
  - Ewentualne przepuszczenie/aktualizacja cookies zwróconych przez Supabase z powrotem do odpowiedzi (odświeżanie sesji).

Dzięki temu:
- Endpointy `/api/*` oraz strony `.astro` mają spójny dostęp do informacji o zalogowanym użytkowniku.
- Nie importujemy bezpośrednio klienta Supabase w endpointach, zgodnie z regułami.


### 3.2. Autoryzacja endpointów `/api/*`

- Wszystkie endpointy opisane w planie REST API (`/api/decks`, `/api/flashcards`, `/api/learn`, `/api/generations`, `/api/admin/*`) zakładają, że użytkownik jest uwierzytelniony.
- Middleware oraz endpointy auth wspierają dwa równoległe mechanizmy:
  - **Token bearer w nagłówku `Authorization`** – zgodnie z planem API (_„Protected endpoints require the token in the `Authorization` header”_).
  - **Sesja w cookies** – obsługiwana automatycznie przez klienta Supabase po stronie serwera.

Przykładowa strategia:
- Jeśli request zawiera nagłówek `Authorization: Bearer <token>`:
  - Middleware lub helper przepisuje ten token do cookies używanych przez `createServerClient`, aby `supabase.auth.getUser()` działało poprawnie.
- Jeśli nagłówek nie istnieje, ale są cookies sesyjne:
  - Middleware polega na cookies.

Endpointy `/api/*` **nie przyjmują `user_id` w body ani query** – pobierają je z `locals.user`, a RLS w Supabase gwarantuje izolację danych.


### 3.3. Przepływ: rejestracja (US-001)

1. Użytkownik otwiera `/auth/register`.
2. `AuthLayout` + `RegisterForm` są renderowane, `locals.user` jest null → brak redirectu.
3. Po wypełnieniu formularza `RegisterForm` wywołuje `POST /api/auth/register`.
4. Endpoint:
   - waliduje dane (Zod),
   - wywołuje `locals.supabase.auth.signUp`,
   - ustawia cookies sesyjne,
   - zwraca `201` + `LoginResponseDto`.
5. Frontend zapisuje ewentualny lokalny stan użytkownika i przekierowuje do `/app`.

Spełnione kryteria akceptacji z PRD (cytaty):
- „Formularz rejestracji zawiera pola na e-mail i hasło (z potwierdzeniem).”
- „Walidacja sprawdza, czy e-mail jest w poprawnym formacie.”
- „Walidacja sprawdza, czy hasła w obu polach są identyczne.”
- „System sprawdza, czy adres e-mail nie jest już zarejestrowany.”
- „Po pomyślnej rejestracji jestem automatycznie zalogowany i przekierowany do panelu głównego.”


### 3.4. Przepływ: logowanie (US-002)

1. Użytkownik otwiera `/auth/login`.
2. Jeśli `locals.user` ≠ null, strona może od razu przekierować na `/app`.
3. `LoginForm` zbiera `email` i `password`.
4. Po submitcie:
   - `POST /api/auth/login`.
   - Endpoint próbuje `supabase.auth.signInWithPassword`.
   - W przypadku sukcesu ustawia cookies i zwraca `200` z tokenem.
5. UI przekierowuje użytkownika do `/app`.

Błąd logowania (401) jest obsługiwany przez UI jako komunikat nad formularzem (bez zdradzania, czy e-mail istnieje).


### 3.5. Przepływ: wylogowanie (US-003)

1. Użytkownik klika „Wyloguj” w `AppLayout`.
2. Komponent wywołuje `logout()` z `useAuthApi`, który wysyła `POST /api/auth/logout`.
3. Endpoint:
   - wywołuje `supabase.auth.signOut`,
   - czyści cookies,
   - zwraca `204`.
4. Frontend czyści lokalny stan i przekierowuje na `/auth/login`.

W PRD: „Po kliknięciu przycisku moja sesja zostaje zakończona i jestem przekierowany na stronę logowania.” – dokładnie to zachowanie zapewnia opisany przepływ.


### 3.6. Przepływ: odzyskiwanie hasła

1. **Inicjacja (zapomniane hasło):**
   - Użytkownik z ekranu logowania przechodzi do `/auth/forgot-password`.
   - Wpisuje e-mail i wysyła formularz.
   - `ForgotPasswordForm` wywołuje `POST /api/auth/forgot-password`.
   - Endpoint używa `supabase.auth.resetPasswordForEmail` z `redirectTo` na `/auth/reset-password`.
   - Użytkownik dostaje e-mail z linkiem resetującym.

2. **Ustawienie nowego hasła:**
   - Użytkownik klika link → otwiera się `/auth/reset-password` z parametrami dostarczonymi przez Supabase.
   - Middleware + `AuthLayout` mogą sprawdzić, czy Supabase ustanowił sesję specjalną dla resetu.
   - `ResetPasswordForm` po wprowadzeniu nowego hasła wywołuje `POST /api/auth/reset-password`.
   - Endpoint zmienia hasło w Supabase (np. `auth.updateUser`).
   - Po sukcesie użytkownik jest proszony o ponowne zalogowanie (opcjonalnie można automatycznie go zalogować – do decyzji produktowej).


### 3.7. Bezpieczeństwo i zgodność z RLS

- **Bezpieczne przechowywanie danych uwierzytelniających** jest zapewnione przez Supabase (hashowane hasła w `auth.users`).
- Dostęp do danych aplikacyjnych (decki, fiszki, generacje) podlega zasadom RLS opisanym w planie API (np. „Row-Level Security (RLS) ensures that users access only records with matching `user_id`”).
- Moduł auth nie przechowuje haseł w bazie aplikacyjnej – wszystko odbywa się przez Supabase Auth.
- Dla endpointów administacyjnych (`/api/admin/generation-errors`) autoryzacja opiera się na metadanych użytkownika (`auth.users` → `role` w metadata), zgodnie z planem API („Admin role is determined by checking `auth.users` metadata (role field)”).


### 3.8. Współpraca z istniejącymi modułami (decks, flashcards, learn, AI)

- Po wdrożeniu auth:
  - Hooki typu `useLearnApi`, `useDecksApi`, `useFlashcardsApi` powinny zacząć:
    - dodawać nagłówek `Authorization: Bearer <access_token>` do wywołań `/api/*`,
    - wykrywać `401 Unauthorized` i przekierowywać użytkownika do `/auth/login`.
  - Endpointy `/api/*` przestają akceptować jakiekolwiek dane identyfikujące użytkownika w body (np. `user_id`) – polegają na `locals.user` i RLS.

- Moduł auth stanowi więc **centralne źródło prawdy o zalogowanym użytkowniku**, a reszta systemu konsumuje tę informację przez:
  - `locals.user` po stronie serwera,
  - Context/store po stronie klienta (np. `AuthContext` aktualizowany na podstawie odpowiedzi z `/api/auth/login` i `/api/auth/register`).

---

## 4. Podsumowanie

- Warstwa UI dzieli aplikację na tryb publiczny (`AuthLayout` + strony `/auth/*`) i tryb zalogowany (`AppLayout` + strony biznesowe), z formularzami React odpowiedzialnymi za walidację i wywołania API.
- Backend udostępnia zestaw endpointów `/api/auth/*` opartych na Supabase Auth, z walidacją Zod, spójnym formatem błędów i logowaniem wyjątków.
- System autentykacji korzysta z Supabase w middleware (Supabase w `locals`, sesja w cookies), wspierając zarówno bearer tokeny w nagłówkach, jak i SSR-owe rozpoznawanie użytkownika.
- Opisane przepływy spełniają wymagania US-001, US-002, US-003 oraz rozszerzają system kont o bezpieczne odzyskiwanie hasła, bez naruszania istniejącego planu API ani funkcjonalności decków/fiszek/nauki.