import type { DeckCardViewModel, DashboardState, DialogState } from "@/components/DashboardPage";

/**
 * Factory function for creating mock deck objects
 * @param id - Deck ID
 * @param overrides - Optional properties to override defaults
 */
export const createMockDeck = (id: number, overrides?: Partial<DeckCardViewModel>): DeckCardViewModel => ({
  id,
  name: `Deck ${id}`,
  flashcard_count: 10,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  updatedLabel: "Updated 1 day ago",
  isMutating: false,
  ...overrides,
});

/**
 * Initial dashboard state matching the component's default
 */
export const initialDashboardState: DashboardState = {
  decks: [],
  isLoading: true,
  sort: "updated_desc",
  unassignedCount: 0,
  dialogState: { type: null },
};

/**
 * Pre-configured deck fixtures for common test scenarios
 */
export const deckFixtures = {
  empty: createMockDeck(1, { name: "Empty Deck", flashcard_count: 0 }),
  small: createMockDeck(2, { name: "Small Deck", flashcard_count: 10 }),
  large: createMockDeck(3, { name: "Large Deck", flashcard_count: 100 }),
  mutating: createMockDeck(4, { name: "Mutating Deck", isMutating: true }),
  recent: createMockDeck(5, {
    name: "Recent Deck",
    updated_at: new Date().toISOString(),
    updatedLabel: "Updated just now",
  }),
  old: createMockDeck(6, {
    name: "Old Deck",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    updatedLabel: "Updated 2 years ago",
  }),
};

/**
 * Pre-configured dialog state fixtures
 */
export const dialogFixtures: Record<string, DialogState> = {
  closed: { type: null },
  create: { type: "create" },
  update: { type: "update", deck: deckFixtures.small },
  delete: { type: "delete", deck: deckFixtures.empty },
};

/**
 * Complete dashboard state fixtures for integration-like tests
 */
export const dashboardStateFixtures = {
  loading: {
    ...initialDashboardState,
    isLoading: true,
  } as DashboardState,

  loadedEmpty: {
    ...initialDashboardState,
    isLoading: false,
    decks: [],
    unassignedCount: 0,
  } as DashboardState,

  loadedWithDecks: {
    ...initialDashboardState,
    isLoading: false,
    decks: [deckFixtures.small, deckFixtures.large, deckFixtures.recent],
    unassignedCount: 5,
  } as DashboardState,

  withOpenDialog: {
    ...initialDashboardState,
    isLoading: false,
    decks: [deckFixtures.small],
    dialogState: dialogFixtures.update,
  } as DashboardState,

  withMutatingDeck: {
    ...initialDashboardState,
    isLoading: false,
    decks: [deckFixtures.small, deckFixtures.mutating],
  } as DashboardState,
};
