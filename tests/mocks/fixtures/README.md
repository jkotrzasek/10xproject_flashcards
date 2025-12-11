# Test Fixtures

This directory contains shared test fixtures used across unit and integration tests.

## Purpose

Fixtures provide:
- **Consistency:** Same test data across all tests
- **Maintainability:** Update once, apply everywhere
- **Readability:** Descriptive names for common scenarios
- **Reusability:** DRY principle for test data

## Structure

```
fixtures/
├── dashboard.fixtures.ts    # Dashboard state, decks, dialogs
└── README.md               # This file
```

## Usage

### Import fixtures in your tests:

```typescript
import {
  createMockDeck,
  deckFixtures,
  dashboardStateFixtures,
} from "../../mocks/fixtures/dashboard.fixtures";
```

### Example:

```typescript
it("should work with pre-configured fixtures", () => {
  const state = dashboardStateFixtures.loadedWithDecks;
  const deck = deckFixtures.small;
  
  expect(state.decks).toContain(deck);
});
```

## Available Fixtures

### Dashboard Fixtures (`dashboard.fixtures.ts`)

#### Factory Functions
- `createMockDeck(id, overrides?)` - Create custom deck with optional overrides

#### Pre-configured Decks
- `deckFixtures.empty` - Deck with 0 flashcards
- `deckFixtures.small` - Deck with 10 flashcards
- `deckFixtures.large` - Deck with 100 flashcards
- `deckFixtures.mutating` - Deck with `isMutating: true`
- `deckFixtures.recent` - Recently updated deck
- `deckFixtures.old` - Old deck from 2023

#### Dialog States
- `dialogFixtures.closed` - No dialog open
- `dialogFixtures.create` - Create dialog open
- `dialogFixtures.update` - Update dialog with deck
- `dialogFixtures.delete` - Delete dialog with deck

#### Complete Dashboard States
- `dashboardStateFixtures.loading` - Initial loading state
- `dashboardStateFixtures.loadedEmpty` - Loaded with no decks
- `dashboardStateFixtures.loadedWithDecks` - Loaded with 3 decks
- `dashboardStateFixtures.withOpenDialog` - State with open dialog
- `dashboardStateFixtures.withMutatingDeck` - State with mutating deck

## Guidelines

### When to Create Fixtures

✅ **Do create fixtures for:**
- Data used in multiple tests
- Complex objects with many properties
- Common test scenarios (empty, small, large, etc.)
- Integration test data

❌ **Don't create fixtures for:**
- One-off test data
- Simple primitives (numbers, strings)
- Test-specific edge cases

### Naming Conventions

- **Factory functions:** `createMock[Entity]()`
- **Collections:** `[entity]Fixtures`
- **State scenarios:** `[module]StateFixtures`
- **Descriptive names:** `empty`, `small`, `large`, `mutating`, etc.

### Maintenance

When adding new fixtures:
1. Add to appropriate fixture file
2. Export from the file
3. Document in this README
4. Update related test documentation

## Alignment with Test Plan

This structure follows `.ai/test-plan.md` Section 5.2 (Test Data):
- ✅ Pre-configured test scenarios
- ✅ Fixtures for different states
- ✅ Reusable across test suites
- ✅ Organized by module/domain

