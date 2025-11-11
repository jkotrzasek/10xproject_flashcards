# Schema bazy danych PostgreSQL - 10xproject_flashcards

## 1. Uwagi wstępne

### 1.1. Tabela użytkowników (auth.users)

**Tabela `auth.users` jest zarządzana przez Supabase Auth i NIE jest tworzona w naszych migracjach.**

Supabase automatycznie dostarcza i zarządza tabelą `auth.users` w schemacie `auth`. Wszystkie nasze tabele domenowe odwołują się do niej przez klucze obce:

```sql
user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

**Struktura auth.users (zarządzana przez Supabase):**
- `id` - uuid, klucz główny
- `email` - text, adres email użytkownika
- `encrypted_password` - text, zahashowane hasło
- `created_at` - timestamptz
- `updated_at` - timestamptz
- oraz inne pola zarządzane przez Supabase Auth

**W naszych migracjach:**
- NIE tworzymy tabeli users
- Używamy `auth.users(id)` jako referencji w Foreign Keys
- Supabase zapewnia integralność referencyjną
- ON DELETE CASCADE w naszych tabelach zapewnia automatyczne czyszczenie danych użytkownika

## 2. Rozszerzenia PostgreSQL

```sql
CREATE EXTENSION IF NOT EXISTS citext;
```

## 2. Typy wyliczeniowe (ENUMs)

```sql
CREATE TYPE flashcard_source AS ENUM ('ai_full', 'ai_edited', 'manual');
CREATE TYPE space_repetition_status AS ENUM ('OK', 'NOK', 'not_checked');
CREATE TYPE generation_status AS ENUM ('pending', 'success', 'error');
```

## 3. Tabele

### 3.1. decks

Przechowuje decki (kategorie) fiszek należące do użytkowników.

**Kolumny:**
- `id` - bigint, klucz główny, auto-increment
- `user_id` - uuid, NOT NULL, FK do auth.users(id), ON DELETE CASCADE
- `name` - citext, NOT NULL, maksymalnie 30 znaków, case-insensitive
- `created_at` - timestamptz, NOT NULL, domyślnie now()
- `updated_at` - timestamptz, NOT NULL, domyślnie now()

**Ograniczenia:**
- UNIQUE(user_id, name) - unikalna nazwa decku w obrębie użytkownika (case-insensitive)
- CHECK na długość nazwy (1-30 znaków)

### 3.2. flashcards

Przechowuje fiszki należące do użytkowników, opcjonalnie przypisane do decków.

**Kolumny:**
- `id` - bigint, klucz główny, auto-increment
- `user_id` - uuid, NOT NULL, FK do auth.users(id), ON DELETE CASCADE
- `deck_id` - bigint, NULL (fiszka może być nieprzypisana)
- `generation_id` - bigint, NULL, FK do generations(session_id), ON DELETE SET NULL (ID sesji generowania, z której pochodzi fiszka)
- `source` - flashcard_source ENUM, NOT NULL (ai_full, ai_edited, manual)
- `front` - text, NOT NULL, maksymalnie 200 znaków (awers fiszki)
- `back` - text, NOT NULL, maksymalnie 500 znaków (rewers fiszki)
- `space_repetition` - space_repetition_status ENUM, NOT NULL, domyślnie 'not_checked'
- `last_repetition` - timestamptz, NULL (czas ostatniej powtórki)
- `created_at` - timestamptz, NOT NULL, domyślnie now()
- `updated_at` - timestamptz, NOT NULL, domyślnie now()

**Ograniczenia:**
- Złożony FK (user_id, deck_id) → decks(user_id, id) z ON DELETE CASCADE
- CHECK na długość front (0-200 znaków)
- CHECK na długość back (0-500 znaków)

### 3.3. generations

Przechowuje historię sesji generowania fiszek przez AI.

**Kolumny:**
- `session_id` - bigint, klucz główny, auto-increment
- `user_id` - uuid, NOT NULL, FK do auth.users(id), ON DELETE CASCADE
- `input_text_hash` - text, NOT NULL (hash SHA-256 tekstu wejściowego)
- `input_text_length` - integer, NOT NULL
- `model` - text, NOT NULL (nazwa modelu AI użytego do generowania)
- `status` - generation_status ENUM, NOT NULL, domyślnie 'pending'
- `generated_total` - integer, NOT NULL, domyślnie 0 (łączna liczba wygenerowanych fiszek)
- `accepted_total` - integer, NOT NULL, domyślnie 0 (liczba zaakceptowanych fiszek)
- `created_at` - timestamptz, NOT NULL, domyślnie now()
- `updated_at` - timestamptz, NOT NULL, domyślnie now()

**Ograniczenia:**
- CHECK accepted_total <= generated_total
- CHECK na nieujemne wartości liczników

### 3.4. generation_error

Przechowuje informacje o błędach podczas generowania fiszek przez AI (relacja 1:1 z generations).

**Kolumny:**
- `session_id` - bigint, klucz główny i FK do generations(session_id), ON DELETE CASCADE
- `user_id` - uuid, NOT NULL, FK do auth.users(id), ON DELETE CASCADE
- `error_code` - text, NULL (kod błędu z API)
- `message` - text, NOT NULL (treść komunikatu błędu)
- `created_at` - timestamptz, NOT NULL, domyślnie now()

**Uwagi:**
- Wpis tworzony tylko gdy generations.status = 'error'
- Relacja 1:1 wymuszona przez PK na session_id

## 4. Relacje między tabelami

### 4.1. auth.users → decks
- **Typ:** jeden-do-wielu (1:N)
- **Opis:** Użytkownik może posiadać wiele decków
- **ON DELETE:** CASCADE (usunięcie użytkownika usuwa jego decki)

### 4.2. auth.users → flashcards
- **Typ:** jeden-do-wielu (1:N)
- **Opis:** Użytkownik może posiadać wiele fiszek
- **ON DELETE:** CASCADE (usunięcie użytkownika usuwa jego fiszki)

### 4.3. decks → flashcards
- **Typ:** jeden-do-wielu (1:N)
- **Opis:** Deck może zawierać wiele fiszek, fiszka może być nieprzypisana (deck_id NULL)
- **FK:** Złożony klucz obcy (user_id, deck_id) → decks(user_id, id)
- **ON DELETE:** CASCADE (usunięcie decku usuwa przypisane do niego fiszki)

### 4.4. auth.users → generations
- **Typ:** jeden-do-wielu (1:N)
- **Opis:** Użytkownik może mieć wiele sesji generowania
- **ON DELETE:** CASCADE (usunięcie użytkownika usuwa jego historię generacji)

### 4.5. generations → generation_error
- **Typ:** jeden-do-jednego (1:1)
- **Opis:** Sesja generowania może mieć maksymalnie jeden rekord błędu
- **ON DELETE:** CASCADE (usunięcie sesji usuwa powiązany błąd)

### 4.6. auth.users → generation_error
- **Typ:** jeden-do-wielu (1:N)
- **Opis:** Użytkownik może mieć wiele błędów generacji
- **ON DELETE:** CASCADE (usunięcie użytkownika usuwa jego błędy generacji)

## 5. Indeksy

### 5.1. Indeksy na decks

```sql
-- Indeks dla szybkiego wyszukiwania decków użytkownika
CREATE INDEX idx_decks_user_id ON decks(user_id);

-- Indeks unikalny już utworzony przez UNIQUE constraint: decks_user_name_unique
```

### 5.2. Indeksy na flashcards

```sql
-- Indeks dla szybkiego wyszukiwania fiszek użytkownika
CREATE INDEX idx_flashcards_user_id ON flashcards(user_id);

-- Indeks dla szybkiego wyszukiwania fiszek w decku
CREATE INDEX idx_flashcards_deck_id ON flashcards(deck_id) WHERE deck_id IS NOT NULL;

-- Indeks dla znajdowania fiszek do nauki (filter na status i sortowanie po last_repetition)
CREATE INDEX idx_flashcards_learning 
    ON flashcards(user_id, deck_id, space_repetition, last_repetition) 
    WHERE deck_id IS NOT NULL;

-- Indeks złożony dla FK constraint (user_id, deck_id) - wspiera JOIN i CASCADE
CREATE INDEX idx_flashcards_user_deck ON flashcards(user_id, deck_id) WHERE deck_id IS NOT NULL;
```

### 5.3. Indeksy na generations

```sql
-- Indeks dla szybkiego wyszukiwania generacji użytkownika
CREATE INDEX idx_generations_user_id ON generations(user_id);

-- Indeks dla zapytań o dzienny limit (sortowanie po created_at w obrębie użytkownika)
CREATE INDEX idx_generations_user_created ON generations(user_id, created_at DESC);

-- Indeks dla automatycznego czyszczenia starych rekordów (retencja 30 dni)
CREATE INDEX idx_generations_created_at ON generations(created_at);
```

### 5.4. Indeksy na generation_error

```sql
-- Indeks dla wyszukiwania błędów użytkownika
CREATE INDEX idx_generation_error_user_id ON generation_error(user_id);
```

## 6. Triggery

### 6.1. Trigger aktualizujący updated_at dla decks

```sql
CREATE OR REPLACE FUNCTION update_decks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_decks_updated_at
    BEFORE UPDATE ON decks
    FOR EACH ROW
    EXECUTE FUNCTION update_decks_updated_at();
```

### 6.2. Trigger aktualizujący updated_at dla flashcards

```sql
CREATE OR REPLACE FUNCTION update_flashcards_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_flashcards_updated_at
    BEFORE UPDATE ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION update_flashcards_updated_at();
```

### 6.3. Trigger zarządzający last_repetition przy zmianie space_repetition

```sql
CREATE OR REPLACE FUNCTION manage_flashcard_last_repetition()
RETURNS TRIGGER AS $$
BEGIN
    -- Jeśli space_repetition zmienia się na 'OK' lub 'NOK', ustaw last_repetition na now()
    IF (NEW.space_repetition IN ('OK', 'NOK') AND 
        (OLD.space_repetition IS DISTINCT FROM NEW.space_repetition)) THEN
        NEW.last_repetition = now();
    END IF;
    
    -- Jeśli space_repetition zmienia się na 'not_checked', wyzeruj last_repetition
    IF (NEW.space_repetition = 'not_checked' AND 
        (OLD.space_repetition IS DISTINCT FROM NEW.space_repetition)) THEN
        NEW.last_repetition = NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_manage_last_repetition
    BEFORE UPDATE OF space_repetition ON flashcards
    FOR EACH ROW
    EXECUTE FUNCTION manage_flashcard_last_repetition();
```

## 7. Zasady Row Level Security (RLS)

### 7.1. Włączenie RLS na tabelach

```sql
ALTER TABLE decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_error ENABLE ROW LEVEL SECURITY;
```

### 7.2. Polityki RLS dla decks

```sql
-- Polityka SELECT: użytkownik widzi tylko swoje decki
CREATE POLICY decks_select_policy ON decks
    FOR SELECT
    USING (user_id = auth.uid());

-- Polityka INSERT: użytkownik może tworzyć tylko swoje decki
CREATE POLICY decks_insert_policy ON decks
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Polityka UPDATE: użytkownik może aktualizować tylko swoje decki
CREATE POLICY decks_update_policy ON decks
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Polityka DELETE: użytkownik może usuwać tylko swoje decki
CREATE POLICY decks_delete_policy ON decks
    FOR DELETE
    USING (user_id = auth.uid());
```

### 7.3. Polityki RLS dla flashcards

```sql
-- Polityka SELECT: użytkownik widzi tylko swoje fiszki
CREATE POLICY flashcards_select_policy ON flashcards
    FOR SELECT
    USING (user_id = auth.uid());

-- Polityka INSERT: użytkownik może tworzyć tylko swoje fiszki
CREATE POLICY flashcards_insert_policy ON flashcards
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Polityka UPDATE: użytkownik może aktualizować tylko swoje fiszki
CREATE POLICY flashcards_update_policy ON flashcards
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Polityka DELETE: użytkownik może usuwać tylko swoje fiszki
CREATE POLICY flashcards_delete_policy ON flashcards
    FOR DELETE
    USING (user_id = auth.uid());
```

### 7.4. Polityki RLS dla generations

```sql
-- Polityka SELECT: użytkownik widzi tylko swoje generacje
CREATE POLICY generations_select_policy ON generations
    FOR SELECT
    USING (user_id = auth.uid());

-- Polityka INSERT: użytkownik może tworzyć tylko swoje generacje
CREATE POLICY generations_insert_policy ON generations
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Polityka UPDATE: użytkownik może aktualizować tylko swoje generacje
CREATE POLICY generations_update_policy ON generations
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Polityka DELETE: użytkownik może usuwać tylko swoje generacje
CREATE POLICY generations_delete_policy ON generations
    FOR DELETE
    USING (user_id = auth.uid());
```

### 7.5. Polityki RLS dla generation_error

```sql
-- Polityka SELECT: użytkownik widzi tylko swoje błędy generacji
CREATE POLICY generation_error_select_policy ON generation_error
    FOR SELECT
    USING (user_id = auth.uid());

-- Polityka INSERT: użytkownik może tworzyć tylko swoje błędy generacji
CREATE POLICY generation_error_insert_policy ON generation_error
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Polityka UPDATE: użytkownik może aktualizować tylko swoje błędy generacji
CREATE POLICY generation_error_update_policy ON generation_error
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Polityka DELETE: użytkownik może usuwać tylko swoje błędy generacji
CREATE POLICY generation_error_delete_policy ON generation_error
    FOR DELETE
    USING (user_id = auth.uid());
```

## 8. Automatyczne czyszczenie starych rekordów (retencja 30 dni)

### 8.1. Funkcja czyszcząca stare generacje

```sql
CREATE OR REPLACE FUNCTION cleanup_old_generations()
RETURNS void AS $$
BEGIN
    DELETE FROM generations
    WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 8.2. Harmonogram czyszczenia (pg_cron lub zewnętrzny scheduler)

```sql
-- Opcja 1: Użycie pg_cron (wymaga rozszerzenia pg_cron w Supabase)
-- SELECT cron.schedule('cleanup-old-generations', '0 2 * * *', 'SELECT cleanup_old_generations()');

-- Opcja 2: Zewnętrzny scheduler (np. GitHub Actions, cron job)
-- lub funkcja Edge Function wywoływana cyklicznie przez zewnętrzny serwis
```

**Uwaga:** Supabase może wymagać użycia Edge Function lub zewnętrznego schedulera zamiast pg_cron. Implementacja może być dostosowana w zależności od dostępności funkcji w środowisku produkcyjnym.

## 9. Indeks złożony dla optymalizacji FK

```sql
-- Indeks wspierający złożony FK w flashcards dla lepszej wydajności CASCADE
CREATE UNIQUE INDEX idx_decks_user_id_id ON decks(user_id, id);
```

## 10. Dodatkowe uwagi i decyzje projektowe

### 10.1. Normalizacja

Schema jest znormalizowany do 3NF:
- Brak redundancji danych
- Każdy atrybut nieprymitywny jest w pełni zależny od klucza głównego
- Brak zależności przechodnich

### 10.2. Bezpieczeństwo

- **RLS włączony globalnie** na wszystkich tabelach domenowych
- Polityki oparte na `user_id = auth.uid()` zapewniają izolację danych użytkowników
- Każda tabela zawiera własne `user_id` - brak polegania na JOIN-ach w politykach RLS
- ON DELETE CASCADE zapewnia automatyczne czyszczenie powiązanych danych

### 10.3. Wydajność

- Minimalna liczba indeksów - tylko te niezbędne dla kluczowych zapytań
- Indeksy częściowe (partial indexes) z `WHERE deck_id IS NOT NULL` dla lepszej wydajności
- Indeksy złożone wspierające typowe wzorce zapytań (user_id + deck_id, user_id + created_at)
- Brak partycjonowania na MVP - prostota i łatwość migracji

### 10.4. Obsługa czasu

- Wszystkie znaczniki czasu w `timestamptz` (UTC)
- Logika "dnia" i stref czasowych (Europe/Warsaw) obsługiwana w warstwie aplikacji
- Unikanie problemów z DST (Daylight Saving Time) w bazie danych

### 10.5. Limity i walidacja

- Limity długości egzekwowane na poziomie DB (CHECK constraints)
- Dzienny limit 10 generacji liczony w aplikacji (brak logiki w DB)
- Walidacja biznesowa (accepted <= generated) zabezpieczona w DB

### 10.6. Spaced Repetition na MVP

- Minimalna implementacja: status (OK/NOK/not_checked) + last_repetition
- Trigger automatycznie zarządza last_repetition przy zmianie statusu
- Brak tabeli review_log - uproszczenie MVP
- Metryki liczone z pól na flashcards (statystyki dzienne)

### 10.7. Source tracking dla fiszek

- ENUM `flashcard_source` umożliwia śledzenie pochodzenia:
  - `ai_full` - w pełni wygenerowana przez AI, niezmodyfikowana
  - `ai_edited` - wygenerowana przez AI, następnie edytowana przez użytkownika
  - `manual` - stworzona ręcznie przez użytkownika
- Wspiera metryki sukcesu z PRD (% fiszek AI vs manualne)

### 10.8. Złożony FK dla flashcards

- FK (user_id, deck_id) → decks(user_id, id) zapewnia:
  - Integralność referencyjna: fiszka nie może być przypisana do decku innego użytkownika
  - ON DELETE CASCADE działa poprawnie dla fiszek przypisanych do decku
  - Fiszki z deck_id = NULL są "nieprzypisane" i nie podlegają kaskadzie usuwania decku

### 10.9. Retencja danych

- Generacje czyszczone automatycznie po 30 dniach
- Implementacja przez funkcję + zewnętrzny scheduler
- Zmniejsza rozmiar tabeli generations i generation_error
- Zachowuje dane istotne dla analizy w krótkim/średnim terminie

### 10.10. Brak tabeli review_log na MVP

- Uproszczenie modelu dla MVP
- Historia powtórek nie jest kluczowa w podstawowej wersji
- Można dodać w przyszłości bez wpływu na istniejące tabele
- Statystyki dzienne liczone z last_repetition i space_repetition

### 10.11. Case-insensitive nazwy decków

- Rozszerzenie `citext` dla kolumny `name` w `decks`
- UNIQUE constraint (user_id, name) zapobiega duplikatom (np. "Math" i "math")
- Zachowuje oryginalne wielkości liter w prezentacji

### 10.12. Puste treści fiszek

- front i back mogą być pustymi stringami (wymagane NOT NULL, ale char_length może być 0)
- Umożliwia zapisywanie fiszek "w budowie" lub specyficznych przypadków użycia
- Walidacja biznesowa może wymagać niepustych treści w aplikacji

