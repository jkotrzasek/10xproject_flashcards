# Plan Testów - AI Flashcard Generator

## 1. Wprowadzenie i cele testowania

### 1.1 Cel dokumentu
Niniejszy plan testów definiuje kompleksową strategię zapewnienia jakości dla aplikacji AI Flashcard Generator - webowej aplikacji do automatycznego generowania fiszek edukacyjnych z wykorzystaniem sztucznej inteligencji.

### 1.2 Cele testowania
- Zapewnienie poprawności działania wszystkich funkcjonalności aplikacji
- Weryfikacja bezpieczeństwa mechanizmów autentykacji i autoryzacji
- Walidacja integralności danych w bazie PostgreSQL (Supabase)
- Potwierdzenie niezawodności integracji z API OpenRouter (generowanie AI)
- Sprawdzenie responsywności interfejsu użytkownika
- Zagwarantowanie dostępności (accessibility) komponentów React i Shadcn/ui
- Weryfikacja poprawności systemu powtórek (spaced repetition)

### 1.3 Kryteria sukcesu
- Pokrycie testami jednostkowymi minimum 80% krytycznej logiki biznesowej
- 100% scenariuszy krytycznych (happy path) objętych testami E2E
- Zero błędów blokujących (severity: critical) przed wdrożeniem
- Wszystkie endpointy API zwracają poprawne kody HTTP i struktury odpowiedzi

---

## 2. Zakres testów

### 2.1 Komponenty objęte testami

#### Backend (API Endpoints)
| Moduł | Endpointy | Priorytet |
|-------|-----------|-----------|
| Auth | `/api/auth/login`, `/api/auth/register`, `/api/auth/logout` | Krytyczny |
| Decks | `/api/decks` (GET, POST), `/api/decks/:deckId` (GET, PATCH, DELETE) | Wysoki |
| Flashcards | `/api/flashcards` (GET, POST), `/api/flashcards/:id` (GET, PATCH, DELETE) | Wysoki |
| Generations | `/api/generations` (GET, POST), `/api/generations/:sessionId`, `/api/generations/limits` | Krytyczny |
| Learn | `/api/learn/:deckId`, `/api/learn/review` | Wysoki |

#### Frontend (Komponenty React)
| Komponent | Funkcjonalność | Priorytet |
|-----------|---------------|-----------|
| `LoginForm`, `RegisterForm` | Formularze autentykacji | Krytyczny |
| `GeneratorPage`, `AIInputForm` | Generowanie fiszek AI | Krytyczny |
| `AIProposalList`, `AIProposal` | Podgląd i edycja propozycji | Wysoki |
| `LearnPage`, `StudyCard` | Sesja nauki | Wysoki |
| `DeckDetailsPage`, `DeckFlashcardList` | Zarządzanie taliami | Średni |
| `ManualPage` | Ręczne tworzenie fiszek | Średni |

#### Serwisy (logika biznesowa)
| Serwis | Odpowiedzialność | Priorytet |
|--------|-----------------|-----------|
| `generation.service.ts` | Generowanie AI, limity, walidacja | Krytyczny |
| `flashcard.service.ts` | CRUD fiszek | Wysoki |
| `deck.service.ts` | CRUD talii | Wysoki |
| `learn.service.ts` | Algorytm powtórek | Wysoki |
| `openrouter.service.ts` | Komunikacja z OpenRouter API | Krytyczny |

### 2.2 Elementy wyłączone z testów
- Wewnętrzna logika Supabase (zewnętrzna zależność)
- Infrastruktura DigitalOcean
- Modele AI OpenRouter (black box)
- Komponenty Shadcn/ui (biblioteka zewnętrzna)
- Testy wydajnościowe (poza zakresem MVP)

---

## 3. Typy testów

### 3.1 Testy jednostkowe (Unit Tests)

**Cel:** Weryfikacja izolowanych jednostek kodu - funkcji, hooków, walidatorów.

**Zakres:**
- Schematy walidacji Zod (`src/lib/validation/*.ts`)
- Funkcje pomocnicze (`calculateHash`, `calculateFlashcardCount`, `formatDate`)
- Custom hooks React (`useGenerate`, `useDecks`, `useSaveFlashcards`)
- Mapowanie błędów (`mapSupabaseAuthError`)
- Parsowanie odpowiedzi AI (`parseFlashcardResponse`, `validateFlashcardProposals`)

**Przykładowe scenariusze:**

```typescript
// Walidacja schematu rejestracji
describe('registerSchema', () => {
  it('powinien odrzucić hasło krótsze niż 8 znaków', () => {
    const result = registerSchema.safeParse({
      email: 'test@test.pl',
      password: '1234567',
      password_confirmation: '1234567'
    });
    expect(result.success).toBe(false);
  });

  it('powinien odrzucić niezgodne hasła', () => {
    const result = registerSchema.safeParse({
      email: 'test@test.pl',
      password: 'password123',
      password_confirmation: 'password456'
    });
    expect(result.success).toBe(false);
  });
});

// Walidacja limitu generacji
describe('calculateFlashcardCount', () => {
  it('powinien zwrócić minimum 10 dla krótkich tekstów', () => {
    expect(calculateFlashcardCount(1000)).toBe(10);
  });
  
  it('powinien zwrócić maksimum 50 dla długich tekstów', () => {
    expect(calculateFlashcardCount(10000)).toBe(50);
  });
});
```

### 3.2 Testy integracyjne (Integration Tests)

**Cel:** Weryfikacja współpracy między modułami - serwisy + baza danych, API + middleware.

**Zakres:**
- Integracja serwisów z Supabase (lokalna instancja Docker dla testów RLS/DB)
- Flow autentykacji (middleware + API endpoints)
- Operacje CRUD na encjach (Deck, Flashcard, Generation)
- Walidacja RLS (Row Level Security) policies

**Przykładowe scenariusze:**

```typescript
// Integracja DeckService z bazą danych
describe('DeckService Integration', () => {
  it('powinien utworzyć talię i zwrócić ID', async () => {
    const deck = await createDeck(supabaseMock, 'user-123', 'Moja talia');
    expect(deck.id).toBeDefined();
  });

  it('powinien zwrócić DECK_NAME_CONFLICT dla duplikatu nazwy', async () => {
    await createDeck(supabaseMock, 'user-123', 'Talia');
    await expect(createDeck(supabaseMock, 'user-123', 'Talia'))
      .rejects.toThrow('DECK_NAME_CONFLICT');
  });
});

// Flow generacji fiszek
describe('Generation Flow', () => {
  it('powinien sprawdzić limit przed generacją', async () => {
    await mockGenerationsForToday(5); // limit = 5
    await expect(ensureDailyLimit(supabase, userId))
      .rejects.toThrow('DAILY_LIMIT_EXCEEDED');
  });
});
```

### 3.3 Testy API (API Tests)

**Cel:** Weryfikacja kontraktów API - kody odpowiedzi, struktury JSON, nagłówki.

**Zakres:**
- Wszystkie endpointy REST (`/api/*`)
- Testy wykonywane na działającej instancji (Playwright Request Context)
- Scenariusze błędów (400, 401, 403, 404, 409, 500)
- Walidacja typów DTO (zgodność z `src/types.ts`)

**Przykładowe scenariusze:**

| Endpoint | Metoda | Scenariusz | Expected |
|----------|--------|-----------|----------|
| `/api/auth/login` | POST | Poprawne dane logowania | 200 + `AuthResponseDto` |
| `/api/auth/login` | POST | Niepotwierdzony email | 401 + `EMAIL_NOT_CONFIRMED` |
| `/api/auth/login` | POST | Błędne hasło | 401 + `INVALID_CREDENTIALS` |
| `/api/decks` | GET | Użytkownik niezalogowany | 302 redirect do `/auth/login` |
| `/api/decks` | POST | Nazwa > 30 znaków | 400 + validation error |
| `/api/generations` | POST | Tekst < 1000 znaków | 400 + validation error |
| `/api/generations` | POST | Przekroczony limit dzienny | 400 + `DAILY_LIMIT_EXCEEDED` |
| `/api/flashcards/:id` | DELETE | ID nieistniejącej fiszki | 404 + `FLASHCARD_NOT_FOUND` |

### 3.4 Testy E2E (End-to-End Tests)

**Cel:** Weryfikacja kompletnych ścieżek użytkownika w przeglądarce.

**Scenariusze krytyczne:**

#### SC-001: Rejestracja i logowanie
1. Otwórz `/auth/register`
2. Wypełnij formularz poprawnymi danymi
3. Potwierdź rejestrację
4. Przejdź do `/auth/login`
5. Zaloguj się
6. Sprawdź przekierowanie do dashboardu

#### SC-002: Generowanie fiszek AI
1. Zaloguj się jako użytkownik
2. Przejdź do `/generator`
3. Wprowadź tekst (min. 1000 znaków)
4. Kliknij "Generuj"
5. Poczekaj na propozycje
6. Zaakceptuj wybrane fiszki
7. Wybierz lub utwórz talię
8. Zapisz fiszki
9. Sprawdź czy fiszki pojawiły się w talii

#### SC-003: Sesja nauki (spaced repetition)
1. Zaloguj się jako użytkownik
2. Przejdź do talii z fiszkami
3. Rozpocznij sesję nauki
4. Odpowiedz na kolejne fiszki (OK/NOK)
5. Zakończ sesję
6. Sprawdź aktualizację statusu `space_repetition`

#### SC-004: Ręczne tworzenie fiszek
1. Przejdź do `/manual`
2. Utwórz fiszkę z przód/tył
3. Przypisz do talii (opcjonalnie)
4. Zapisz
5. Zweryfikuj pojawienie się fiszki

### 3.5 Testy bezpieczeństwa (Security Tests)

**Zakres:**
- Weryfikacja RLS policies w Supabase (na lokalnej instancji Docker)
- Testowanie tokenów JWT (expiration, refresh)
- Próby dostępu do zasobów innych użytkowników
- Walidacja wejść (XSS, SQL injection w Zod)
- Sprawdzenie HTTP-only cookies

**Scenariusze:**

| Test | Oczekiwanie |
|------|------------|
| Dostęp do `/api/decks` bez tokena | 302 redirect |
| Dostęp do talii innego użytkownika | 404 (nie 403) |
| Token po wygaśnięciu | 401 + refresh flow |
| XSS w nazwie talii | Zod odrzuci `<script>` |
| SQL injection w filtrach | Zod odrzuci |

### 3.6 Testy dostępności (Accessibility Tests)

**Standardy:** WCAG 2.1 AA

**Zakres:**
- Nawigacja klawiaturą (Tab, Enter, Escape)
- Atrybuty ARIA w komponentach Shadcn/ui
- Kontrast kolorów (min. 4.5:1)
- Etykiety formularzy (`aria-label`, `aria-describedby`)
- Screen reader compatibility

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1 Moduł Autentykacji

| ID | Scenariusz | Kroki | Oczekiwany rezultat |
|----|-----------|-------|---------------------|
| AUTH-001 | Rejestracja - sukces | POST `/api/auth/register` z poprawnymi danymi | 200, wysłany email potwierdzający |
| AUTH-002 | Rejestracja - email zajęty | POST z istniejącym emailem | 409, `EMAIL_ALREADY_REGISTERED` |
| AUTH-003 | Rejestracja - słabe hasło | POST z hasłem < 8 znaków | 400, walidacja Zod |
| AUTH-004 | Logowanie - sukces | POST `/api/auth/login` z poprawnymi danymi | 200, cookies ustawione |
| AUTH-005 | Logowanie - niepotwierdzony email | POST z niepotwierdoznym kontem | 401, `EMAIL_NOT_CONFIRMED` |
| AUTH-006 | Logowanie - złe hasło | POST z błędnym hasłem | 401, `INVALID_CREDENTIALS` |
| AUTH-007 | Wylogowanie | POST `/api/auth/logout` | 200, cookies usunięte |
| AUTH-008 | Middleware - chroniona strona | GET `/generator` bez sesji | 302 redirect do `/auth/login` |

### 4.2 Moduł Generacji AI

| ID | Scenariusz | Kroki | Oczekiwany rezultat |
|----|-----------|-------|---------------------|
| GEN-001 | Generacja - sukces | POST `/api/generations` z tekstem 1000-10000 znaków | 200, propozycje fiszek |
| GEN-002 | Generacja - tekst za krótki | POST z tekstem < 1000 znaków | 400, błąd walidacji |
| GEN-003 | Generacja - przekroczony limit | POST gdy `used_today >= daily_limit` | 400, `DAILY_LIMIT_EXCEEDED` |
| GEN-004 | Generacja - duplikat | POST z identycznym hashem tekstu | 400, `DUPLICATE_GENERATION` |
| GEN-005 | Pobieranie limitów | GET `/api/generations/limits` | 200, `GenerationLimitDto` |
| GEN-006 | Timeout AI | Symulacja timeout OpenRouter | 500, `AI_TIMEOUT` |
| GEN-007 | Niepoprawna odpowiedź AI | Mock invalid JSON z AI | 500, `AI_RESPONSE_INVALID` |
| GEN-008 | Aktualizacja accepted_total | PATCH `/api/generations/:id/accepted` | 200, wartość zaktualizowana |

### 4.3 Moduł Talii (Decks)

| ID | Scenariusz | Kroki | Oczekiwany rezultat |
|----|-----------|-------|---------------------|
| DECK-001 | Tworzenie talii | POST `/api/decks` z nazwą | 201, ID talii |
| DECK-002 | Duplikat nazwy | POST z istniejącą nazwą | 409, `DECK_NAME_CONFLICT` |
| DECK-003 | Lista talii | GET `/api/decks` | 200, tablica `DeckDto[]` z `flashcard_count` |
| DECK-004 | Sortowanie | GET `/api/decks?sort=name_asc` | 200, posortowana lista |
| DECK-005 | Szczegóły talii | GET `/api/decks/:id` | 200, `DeckDto` |
| DECK-006 | Edycja nazwy | PATCH `/api/decks/:id` | 200, `DeckUpdatedDto` |
| DECK-007 | Usuwanie talii | DELETE `/api/decks/:id` | 204, talia usunięta (cascade fiszki) |
| DECK-008 | Reset postępu | POST `/api/decks/:id/reset` | 200, `space_repetition` = 'not_checked' |

### 4.4 Moduł Fiszek (Flashcards)

| ID | Scenariusz | Kroki | Oczekiwany rezultat |
|----|-----------|-------|---------------------|
| FLASH-001 | Tworzenie wielu fiszek | POST `/api/flashcards` z tablicą | 201, `FlashcardCreatedDto[]` |
| FLASH-002 | Tworzenie - nieistniejąca talia | POST z `deck_id` nieistniejącym | 400, `FLASHCARD_DECK_NOT_FOUND` |
| FLASH-003 | Lista fiszek | GET `/api/flashcards` | 200, `FlashcardDto[]` |
| FLASH-004 | Filtrowanie po talii | GET `/api/flashcards?deck_id=1` | 200, fiszki z talii |
| FLASH-005 | Filtrowanie nieprzypisanych | GET `/api/flashcards?unassigned=true` | 200, fiszki bez talii |
| FLASH-006 | Edycja fiszki | PATCH `/api/flashcards/:id` | 200, `FlashcardUpdatedDto` |
| FLASH-007 | Auto-zmiana source | PATCH fiszki `ai_full` (zmiana front/back) | source zmienia się na `ai_edited` |
| FLASH-008 | Usuwanie fiszki | DELETE `/api/flashcards/:id` | 204 |

### 4.5 Moduł Nauki (Learn)

| ID | Scenariusz | Kroki | Oczekiwany rezultat |
|----|-----------|-------|---------------------|
| LEARN-001 | Pobieranie fiszek do nauki | GET `/api/learn/:deckId` | 200, `LearnResponseDto` |
| LEARN-002 | Priorytet NOK/not_checked | GET gdy mieszane statusy | Najpierw NOK/not_checked, potem OK |
| LEARN-003 | Limit fiszek | GET `/api/learn/:deckId?limit=10` | max 10 fiszek |
| LEARN-004 | Zapisanie recenzji | PATCH `/api/learn/review` | 200, liczba zaktualizowanych |
| LEARN-005 | Recenzja nieistniejącej fiszki | PATCH z nieistniejącym ID | 400, `LEARN_FLASHCARD_NOT_FOUND` |

---

## 5. Środowisko testowe

### 5.1 Środowiska

| Środowisko | Cel | Baza danych | AI API |
|------------|-----|-------------|--------|
| Lokalne (dev) | Testy jednostkowe, integracyjne | Supabase local (Docker) | Mock |
| CI (GitHub Actions) | Testy automatyczne | Supabase test project | Mock |
| Staging | Testy E2E, manualne | Supabase staging | OpenRouter (niski limit) |
| Produkcja | Smoke tests po deploy | Supabase prod | OpenRouter (pełny limit) |

### 5.2 Dane testowe

**Użytkownicy testowi:**
- `test-user@example.com` - standardowy użytkownik
- `test-admin@example.com` - użytkownik z wieloma taliami
- `test-new@example.com` - nowy użytkownik (brak danych)

**Fixtures:**
- 3 talie (pusta, mała 10 fiszek, duża 100 fiszek)
- Fiszki z różnymi statusami `space_repetition`
- Generacje w różnych stanach (`pending`, `success`, `error`)

### 5.3 Zmienne środowiskowe testowe

```env
PUBLIC_SUPABASE_URL=https://test-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
OPENROUTER_API_KEY=sk-or-test-...
DAILY_GENERATION_LIMIT=3
```

---

## 6. Narzędzia do testowania

### 6.1 Stack technologiczny

| Typ testu | Narzędzie | Uzasadnienie |
|-----------|-----------|--------------|
| Unit | **Vitest** | Natywne wsparcie Vite/Astro, szybkie wykonanie, kompatybilność z Jest API |
| Unit (React) | **React Testing Library** | Standard dla testowania komponentów React |
| Integration | **Vitest** + **MSW** (Mock Service Worker) | Mockowanie API na poziomie sieci |
| API | **Playwright** | Testowanie endpointów Astro na działającym serwerze (APIRequestContext) |
| E2E | **Playwright** | Wsparcie wielu przeglądarek, niezawodność, dobre API |
| Visual | **Playwright** | Wykrywanie regresji wizualnych (snapshots) |
| Accessibility | **axe-core** + **Playwright** | Automatyczne skanowanie a11y |

### 6.2 Konfiguracja package.json

```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.0.0",
    "@playwright/test": "^1.45.0",
    "msw": "^2.0.0",
    "happy-dom": "^14.0.0",
    "@axe-core/playwright": "^4.0.0"
  },
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### 6.3 Struktura katalogów testowych

```
├── tests/
│   ├── unit/
│   │   ├── lib/
│   │   │   ├── validation/
│   │   │   │   ├── authSchemas.test.ts
│   │   │   │   ├── deck.schema.test.ts
│   │   │   │   └── generation.schema.test.ts
│   │   │   └── services/
│   │   │       ├── deck.service.test.ts
│   │   │       ├── flashcard.service.test.ts
│   │   │       └── generation.service.test.ts
│   │   └── components/
│   │       ├── auth/
│   │       │   └── LoginForm.test.tsx
│   │       └── generation/
│   │           └── AIInputForm.test.tsx
│   ├── integration/
│   │   ├── services/
│   │   │   └── generation-flow.test.ts
│   ├── api/
│   │   ├── auth.test.ts
│   │   ├── decks.test.ts
│   │   └── generations.test.ts
│   ├── e2e/
│   │   ├── auth.spec.ts
│   │   ├── generator.spec.ts
│   │   ├── learn.spec.ts
│   │   └── fixtures/
│   └── mocks/
│       ├── handlers.ts
│       └── supabase.ts
├── vitest.config.ts
└── playwright.config.ts
```

---

## 7. Kryteria akceptacji testów

### 7.1 Kryteria wejścia (Entry Criteria)
- Środowisko testowe skonfigurowane i dostępne
- Dane testowe załadowane
- Wszystkie zależności zaktualizowane
- Dokumentacja API aktualna

### 7.2 Kryteria wyjścia (Exit Criteria)

| Kryterium | Wartość docelowa |
|-----------|------------------|
| Pokrycie kodu (coverage) - statements | ≥ 75% |
| Pokrycie kodu (coverage) - branches | ≥ 70% |
| Testy jednostkowe - pass rate | 100% |
| Testy integracyjne - pass rate | 100% |
| Testy E2E (krytyczne) - pass rate | 100% |
| Testy E2E (pozostałe) - pass rate | ≥ 95% |
| Błędy krytyczne (P1) | 0 |
| Błędy wysokie (P2) | ≤ 2 (z planem naprawy) |

### 7.3 Definicja priorytetu błędów

| Priorytet | Opis | SLA naprawy |
|-----------|------|-------------|
| P1 - Krytyczny | Brak możliwości logowania, utrata danych, security breach | 4h |
| P2 - Wysoki | Główna funkcjonalność nie działa (generacja AI, nauka) | 24h |
| P3 - Średni | Funkcjonalność działa z ograniczeniami | 72h |
| P4 - Niski | Kosmetyczne, UX improvements | Backlog |

---

## 8. Role i odpowiedzialności

### 8.1 Macierz odpowiedzialności (RACI)

| Zadanie | Developer | QA Engineer | Tech Lead | Product Owner |
|---------|-----------|-------------|-----------|---------------|
| Pisanie testów jednostkowych | **R** | C | A | I |
| Pisanie testów integracyjnych | R | **R** | A | I |
| Pisanie testów E2E | C | **R** | A | I |
| Review testów | R | R | **A** | I |
| Wykonanie testów manualnych | I | **R** | C | I |
| Analiza wyników | C | **R** | A | I |
| Decyzja o release | I | C | R | **A** |
| Naprawa błędów | **R** | C | A | I |

*R - Responsible, A - Accountable, C - Consulted, I - Informed*

### 8.2 Kompetencje wymagane

**Developer:**
- Znajomość Vitest
- Umiejętność pisania testów React (RTL)
- Rozumienie mockowania (MSW, vi.mock)

**QA Engineer:**
- Znajomość Playwright
- Umiejętność projektowania przypadków testowych
- Rozumienie CI/CD (GitHub Actions)

---

## 9. Procedury raportowania błędów

### 9.1 Proces zgłaszania

1. **Identyfikacja** - wykrycie błędu podczas testów
2. **Reprodukcja** - potwierdzenie powtarzalności
3. **Dokumentacja** - utworzenie issue w GitHub
4. **Klasyfikacja** - przypisanie priorytetu i labels
5. **Przypisanie** - skierowanie do właściwego developera
6. **Weryfikacja** - retesty po naprawie

### 9.2 Szablon zgłoszenia błędu (GitHub Issue)

```markdown
## Opis błędu
[Krótki, jasny opis problemu]

## Kroki reprodukcji
1. [Krok 1]
2. [Krok 2]
3. [Krok 3]

## Oczekiwane zachowanie
[Co powinno się wydarzyć]

## Aktualne zachowanie
[Co się wydarzyło]

## Środowisko
- Browser: [np. Chrome 120]
- OS: [np. Windows 11]
- Środowisko: [dev/staging/prod]

## Logi / Screenshoty
[Załącz console errors, screenshoty, nagrania]

## Priorytet
- [ ] P1 - Krytyczny
- [ ] P2 - Wysoki
- [ ] P3 - Średni
- [ ] P4 - Niski

## Testy
- [ ] Test jednostkowy do dodania
- [ ] Test E2E do dodania
```

### 9.3 Labels dla GitHub Issues

| Label | Kolor | Zastosowanie |
|-------|-------|--------------|
| `bug` | #d73a4a | Błąd w aplikacji |
| `priority:P1` | #b60205 | Krytyczny |
| `priority:P2` | #d93f0b | Wysoki |
| `priority:P3` | #fbca04 | Średni |
| `priority:P4` | #0e8a16 | Niski |
| `area:auth` | #1d76db | Moduł autentykacji |
| `area:generation` | #5319e7 | Moduł generacji AI |
| `area:learn` | #006b75 | Moduł nauki |
| `needs:test` | #f9d0c4 | Wymaga napisania testu |

### 9.4 Raportowanie statusu testów

**Daily:**
- Automated report z CI (Slack/Discord webhook)
- Liczba passed/failed/skipped

**Weekly:**
- Podsumowanie coverage trends
- Lista otwartych bugów per priorytet
- Postęp względem kryteriów wyjścia

**Per Release:**
- Test Execution Report
- Coverage Report
- Lista znanych problemów (known issues)
- Sign-off od QA i PO

---

## Załączniki

### A. Przykładowa konfiguracja Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**', 'src/components/**'],
      exclude: ['src/components/ui/**'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
```

### B. Przykładowa konfiguracja Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

### C. Workflow GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4

  e2e:
    runs-on: ubuntu-latest
    needs: unit-and-integration
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```


