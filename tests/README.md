# Testing Setup

Środowisko testowe skonfigurowane zgodnie ze specyfikacją techniczną projektu.

## Struktura testów

```
tests/                      # Testy jednostkowe i integracyjne
├── setup.ts               # Konfiguracja środowiska testowego Vitest
├── mocks/
│   └── handlers.ts        # MSW handlers do mockowania API
├── unit/
│   ├── lib/               # Testy funkcji pomocniczych
│   │   └── format-date.test.ts  # Testy formatowania dat (63 tests, 100% coverage)
│   ├── components/        # Testy komponentów React
│   │   └── dashboardReducer.test.ts  # Testy reducera dashboardu (40 tests)
│   └── doc/               # Dokumentacja testów
│       ├── format-date.test.md
│       ├── format-date-tests-plan.md
│       └── dashboardReducer.test.md
└── example.test.ts        # Przykładowy test (do usunięcia)

e2e/                       # Testy E2E
├── setup/
│   └── global-setup.ts    # Globalna konfiguracja Playwright
├── page-objects/          # Page Object Models
└── example.spec.ts        # Przykładowy test E2E (do usunięcia)
```

## Testy jednostkowe (Vitest)

### Uruchomienie

```bash
# Jednokrotne uruchomienie
npm test

# Tryb watch (podczas developmentu)
npm run test:watch

# UI mode (wizualna nawigacja)
npm run test:ui

# Z pokryciem kodu
npm run test:coverage
```

### Konfiguracja

- **Environment**: jsdom (dla testów komponentów DOM/React)
- **Coverage threshold**: 80% lines, functions, statements; 75% branches
- **Setup file**: `tests/setup.ts` - MSW server i React Testing Library cleanup

### Istniejące testy jednostkowe

#### ✅ `format-date.test.ts` - Formatowanie dat
- **Lokalizacja:** `tests/unit/lib/format-date.test.ts`
- **Funkcja:** `formatDate()` z `src/lib/format-date.ts`
- **Testy:** 63 przypadków testowych
- **Pokrycie:** 100% (statements, branches, functions, lines)
- **Dokumentacja:** `tests/unit/doc/format-date.test.md`
- **Typy testów:** Względne formatowanie czasu, pełne daty, edge cases, time-dependent
- **Techniki:** Fake timers (`vi.useFakeTimers()`), testy parametryzowane (`describe.each()`)

```bash
npm run test -- format-date
npm run test:coverage -- tests/unit/lib/format-date.test.ts
```

#### ✅ `dashboardReducer.test.ts` - Reducer dashboardu
- **Lokalizacja:** `tests/unit/components/dashboardReducer.test.ts`
- **Funkcja:** `dashboardReducer` z `src/components/DashboardPage.tsx`
- **Testy:** 40 przypadków testowych
- **Dokumentacja:** `tests/unit/doc/dashboardReducer.test.md`
- **Typy testów:** Akcje reducera, immutability, state transitions

```bash
npm run test -- dashboardReducer
```

### Przykład testu komponentu

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    // Arrange
    render(<MyComponent />);

    // Act & Assert
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    // Arrange
    const user = userEvent.setup();
    render(<MyComponent />);

    // Act
    await user.click(screen.getByRole('button'));

    // Assert
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

### Mockowanie API (MSW)

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/flashcards', () => {
    return HttpResponse.json([
      { id: 1, front: 'Question', back: 'Answer' }
    ]);
  }),
];
```

## Testy E2E (Playwright)

### Uruchomienie

```bash
# Jednokrotne uruchomienie (headless)
npm run test:e2e

# UI mode (wizualna nawigacja)
npm run test:e2e:ui

# Tryb headed (widoczna przeglądarka)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

### Konfiguracja

- **Browser**: Chromium only (Desktop Chrome)
- **Base URL**: http://localhost:4321
- **Web Server**: Automatyczne uruchomienie `npm run dev` przed testami
- **Parallel execution**: Włączone
- **Screenshots**: Tylko przy błędach
- **Video**: Zachowane przy błędach
- **Traces**: Przy ponownych próbach

### Page Object Model

```typescript
// e2e/page-objects/HomePage.ts
import { Page, Locator } from '@playwright/test';

export class HomePage {
  readonly page: Page;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginButton = page.getByTestId('login-button');
  }

  async goto() {
    await this.page.goto('/');
  }

  async login() {
    await this.loginButton.click();
  }
}
```

### Przykład testu E2E

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { HomePage } from './page-objects/HomePage';

test.describe('Home Page', () => {
  test('should display homepage', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);

    // Act
    await homePage.goto();

    // Assert
    await expect(page).toHaveTitle(/My App/);
  });

  test('should pass accessibility checks', async ({ page }) => {
    // Arrange
    await page.goto('/');

    // Act
    const results = await new AxeBuilder({ page }).analyze();

    // Assert
    expect(results.violations).toEqual([]);
  });
});
```

### Selektory testowe

Używaj atrybutu `data-testid` dla elementów wymagających interakcji w testach:

```tsx
<button data-testid="submit-button">Submit</button>
```

```typescript
await page.getByTestId('submit-button').click();
```

## Uruchomienie wszystkich testów

```bash
npm run test:all
```

Uruchamia testy jednostkowe z pokryciem kodu oraz testy E2E.

## Best Practices

### Vitest
- Używaj `vi.fn()` dla mocków funkcji
- Używaj `vi.spyOn()` do monitorowania istniejących funkcji
- Definiuj `vi.mock()` factory na początku pliku testowego
- Stosuj pattern Arrange-Act-Assert
- Używaj `toMatchInlineSnapshot()` dla złożonych asercji

### Playwright
- Stosuj Page Object Model dla skalowalności
- Używaj `data-testid` dla stabilnych selektorów
- Testuj API backendu bezpośrednio przez Playwright
- Implementuj testy accessibility z `@axe-core/playwright`
- Używaj trace viewer do debugowania błędów
- Stosuj pattern Arrange-Act-Assert

## Narzędzia deweloperskie

### Vitest UI
```bash
npm run test:ui
```
Otwiera interfejs webowy z wizualizacją testów, wynikami i możliwością debugowania.

### Playwright UI
```bash
npm run test:e2e:ui
```
Otwiera interfejs graficzny z możliwością uruchamiania testów, podglądu przeglądarki i analizy wyników.

### Playwright Codegen
```bash
npx playwright codegen http://localhost:4321
```
Narzędzie do nagrywania interakcji użytkownika i generowania kodu testów.

### Trace Viewer
```bash
npx playwright show-trace trace.zip
```
Wizualizacja nagranych trace'ów z nieudanych testów.

