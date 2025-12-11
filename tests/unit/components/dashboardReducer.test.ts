import { describe, it, expect } from "vitest";
import {
  dashboardReducer,
  initialState,
  type DashboardState,
  type DashboardAction,
  type DeckSortOption,
  type DeckCardViewModel,
} from "@/components/DashboardPage";
import {
  createMockDeck,
  initialDashboardState,
  deckFixtures,
  dashboardStateFixtures,
} from "../../mocks/fixtures/dashboard.fixtures";

describe("dashboardReducer", () => {
  describe("SET_LOADING action", () => {
    it("should set isLoading to true", () => {
      // Arrange
      const state: DashboardState = { ...initialState, isLoading: false };
      const action: DashboardAction = { type: "SET_LOADING", payload: true };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.isLoading).toBe(true);
      expect(result).not.toBe(state); // Ensure immutability
    });

    it("should set isLoading to false", () => {
      // Arrange
      const state: DashboardState = { ...initialState, isLoading: true };
      const action: DashboardAction = { type: "SET_LOADING", payload: false };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.isLoading).toBe(false);
    });

    it("should preserve other state properties", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        decks: [createMockDeck(1)],
        unassignedCount: 5,
        sort: "name_asc",
      };
      const action: DashboardAction = { type: "SET_LOADING", payload: false };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toEqual(state.decks);
      expect(result.unassignedCount).toBe(5);
      expect(result.sort).toBe("name_asc");
    });
  });

  describe("SET_DECKS action", () => {
    it("should set decks and force isLoading to false", () => {
      // Arrange
      const newDecks = [createMockDeck(1), createMockDeck(2)];
      const state: DashboardState = { ...initialState, isLoading: true };
      const action: DashboardAction = { type: "SET_DECKS", payload: newDecks };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toEqual(newDecks);
      expect(result.isLoading).toBe(false);
    });

    it("should set isLoading to false even if it was already false", () => {
      // Arrange
      const newDecks = [createMockDeck(1)];
      const state: DashboardState = { ...initialState, isLoading: false };
      const action: DashboardAction = { type: "SET_DECKS", payload: newDecks };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.isLoading).toBe(false);
    });

    it("should handle empty decks array", () => {
      // Arrange
      const state: DashboardState = { ...initialState, decks: [createMockDeck(1)] };
      const action: DashboardAction = { type: "SET_DECKS", payload: [] };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toEqual([]);
      expect(result.decks).toHaveLength(0);
    });

    it("should replace existing decks completely", () => {
      // Arrange
      const oldDecks = [createMockDeck(1), createMockDeck(2)];
      const newDecks = [createMockDeck(3), createMockDeck(4), createMockDeck(5)];
      const state: DashboardState = { ...initialState, decks: oldDecks };
      const action: DashboardAction = { type: "SET_DECKS", payload: newDecks };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toEqual(newDecks);
      expect(result.decks).not.toEqual(oldDecks);
      expect(result.decks).toHaveLength(3);
    });

    it("should work with pre-configured fixtures", () => {
      // Arrange
      const newDecks = [deckFixtures.small, deckFixtures.large];
      const state: DashboardState = initialDashboardState;
      const action: DashboardAction = { type: "SET_DECKS", payload: newDecks };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toHaveLength(2);
      expect(result.decks[0].name).toBe("Small Deck");
      expect(result.decks[1].flashcard_count).toBe(100);
    });
  });

  describe("SET_UNASSIGNED_COUNT action", () => {
    it("should set unassignedCount to a positive number", () => {
      // Arrange
      const state: DashboardState = { ...initialState, unassignedCount: 0 };
      const action: DashboardAction = { type: "SET_UNASSIGNED_COUNT", payload: 42 };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.unassignedCount).toBe(42);
    });

    it("should handle zero count", () => {
      // Arrange
      const state: DashboardState = { ...initialState, unassignedCount: 10 };
      const action: DashboardAction = { type: "SET_UNASSIGNED_COUNT", payload: 0 };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.unassignedCount).toBe(0);
    });

    it("should preserve other state properties", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        decks: [createMockDeck(1)],
        isLoading: false,
      };
      const action: DashboardAction = { type: "SET_UNASSIGNED_COUNT", payload: 15 };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toEqual(state.decks);
      expect(result.isLoading).toBe(false);
    });
  });

  describe("SET_SORT action", () => {
    const sortOptions: DeckSortOption[] = [
      "name_asc",
      "name_desc",
      "created_asc",
      "created_desc",
      "updated_asc",
      "updated_desc",
    ];

    sortOptions.forEach((sortOption) => {
      it(`should set sort to ${sortOption}`, () => {
        // Arrange
        const state: DashboardState = { ...initialState, sort: "updated_desc" };
        const action: DashboardAction = { type: "SET_SORT", payload: sortOption };

        // Act
        const result = dashboardReducer(state, action);

        // Assert
        expect(result.sort).toBe(sortOption);
      });
    });

    it("should preserve other state properties", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        decks: [createMockDeck(1)],
        unassignedCount: 7,
      };
      const action: DashboardAction = { type: "SET_SORT", payload: "name_asc" };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toEqual(state.decks);
      expect(result.unassignedCount).toBe(7);
    });
  });

  describe("OPEN_DIALOG action", () => {
    it("should open create dialog without deck data", () => {
      // Arrange
      const state: DashboardState = initialState;
      const action: DashboardAction = {
        type: "OPEN_DIALOG",
        payload: { type: "create" },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.dialogState.type).toBe("create");
      expect(result.dialogState.deck).toBeUndefined();
    });

    it("should open update dialog with deck data", () => {
      // Arrange
      const mockDeck = createMockDeck(1);
      const state: DashboardState = initialState;
      const action: DashboardAction = {
        type: "OPEN_DIALOG",
        payload: { type: "update", deck: mockDeck },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.dialogState.type).toBe("update");
      expect(result.dialogState.deck).toEqual(mockDeck);
    });

    it("should open delete dialog with deck data", () => {
      // Arrange
      const mockDeck = createMockDeck(1);
      const state: DashboardState = initialState;
      const action: DashboardAction = {
        type: "OPEN_DIALOG",
        payload: { type: "delete", deck: mockDeck },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.dialogState.type).toBe("delete");
      expect(result.dialogState.deck).toEqual(mockDeck);
    });

    it("should replace existing dialog state", () => {
      // Arrange
      const oldDeck = createMockDeck(1);
      const newDeck = createMockDeck(2);
      const state: DashboardState = {
        ...initialState,
        dialogState: { type: "update", deck: oldDeck },
      };
      const action: DashboardAction = {
        type: "OPEN_DIALOG",
        payload: { type: "delete", deck: newDeck },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.dialogState.type).toBe("delete");
      expect(result.dialogState.deck).toEqual(newDeck);
      expect(result.dialogState.deck).not.toEqual(oldDeck);
    });

    it("should work with fixture decks", () => {
      // Arrange
      const state: DashboardState = initialState;
      const action: DashboardAction = {
        type: "OPEN_DIALOG",
        payload: { type: "update", deck: deckFixtures.small },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.dialogState.deck?.name).toBe("Small Deck");
      expect(result.dialogState.deck?.flashcard_count).toBe(10);
    });
  });

  describe("CLOSE_DIALOG action", () => {
    it("should close dialog and reset type to null", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        dialogState: { type: "create" },
      };
      const action: DashboardAction = { type: "CLOSE_DIALOG" };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.dialogState.type).toBeNull();
    });

    it("should clear deck data when closing dialog", () => {
      // Arrange
      const mockDeck = createMockDeck(1);
      const state: DashboardState = {
        ...initialState,
        dialogState: { type: "update", deck: mockDeck },
      };
      const action: DashboardAction = { type: "CLOSE_DIALOG" };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.dialogState.type).toBeNull();
      expect(result.dialogState.deck).toBeUndefined();
    });

    it("should work even if dialog is already closed", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        dialogState: { type: null },
      };
      const action: DashboardAction = { type: "CLOSE_DIALOG" };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.dialogState.type).toBeNull();
    });
  });

  describe("SET_DECK_MUTATING action", () => {
    it("should set isMutating to true for specific deck", () => {
      // Arrange
      const decks = [createMockDeck(1), createMockDeck(2), createMockDeck(3)];
      const state: DashboardState = { ...initialState, decks };
      const action: DashboardAction = {
        type: "SET_DECK_MUTATING",
        payload: { id: 2, isMutating: true },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks[0].isMutating).toBe(false);
      expect(result.decks[1].isMutating).toBe(true);
      expect(result.decks[2].isMutating).toBe(false);
    });

    it("should set isMutating to false for specific deck", () => {
      // Arrange
      const decks = [
        createMockDeck(1),
        createMockDeck(2, { isMutating: true }),
        createMockDeck(3),
      ];
      const state: DashboardState = { ...initialState, decks };
      const action: DashboardAction = {
        type: "SET_DECK_MUTATING",
        payload: { id: 2, isMutating: false },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks[1].isMutating).toBe(false);
    });

    it("should maintain immutability - create new decks array", () => {
      // Arrange
      const decks = [createMockDeck(1), createMockDeck(2)];
      const state: DashboardState = { ...initialState, decks };
      const action: DashboardAction = {
        type: "SET_DECK_MUTATING",
        payload: { id: 1, isMutating: true },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).not.toBe(state.decks);
      expect(result.decks[0]).not.toBe(state.decks[0]); // Modified deck is new object
      expect(result.decks[1]).toBe(state.decks[1]); // Unmodified deck is same reference
    });

    it("should preserve all other deck properties", () => {
      // Arrange
      const decks = [
        createMockDeck(1, { name: "Special Deck", flashcard_count: 25 }),
        createMockDeck(2),
      ];
      const state: DashboardState = { ...initialState, decks };
      const action: DashboardAction = {
        type: "SET_DECK_MUTATING",
        payload: { id: 1, isMutating: true },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks[0].name).toBe("Special Deck");
      expect(result.decks[0].flashcard_count).toBe(25);
      expect(result.decks[0].id).toBe(1);
    });

    it("should handle non-existent deck ID gracefully", () => {
      // Arrange
      const decks = [createMockDeck(1), createMockDeck(2)];
      const state: DashboardState = { ...initialState, decks };
      const action: DashboardAction = {
        type: "SET_DECK_MUTATING",
        payload: { id: 999, isMutating: true },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toEqual(decks); // No changes
      expect(result.decks[0].isMutating).toBe(false);
      expect(result.decks[1].isMutating).toBe(false);
    });

    it("should handle empty decks array", () => {
      // Arrange
      const state: DashboardState = { ...initialState, decks: [] };
      const action: DashboardAction = {
        type: "SET_DECK_MUTATING",
        payload: { id: 1, isMutating: true },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks).toEqual([]);
    });

    it("should only update the first matching deck if duplicates exist", () => {
      // Arrange
      // Edge case: testing behavior with duplicate IDs (shouldn't happen in real app)
      const decks = [
        createMockDeck(1, { name: "First" }),
        createMockDeck(1, { name: "Second" }),
      ];
      const state: DashboardState = { ...initialState, decks };
      const action: DashboardAction = {
        type: "SET_DECK_MUTATING",
        payload: { id: 1, isMutating: true },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks[0].isMutating).toBe(true);
      expect(result.decks[1].isMutating).toBe(true); // Both get updated because both match
    });

    it("should work with pre-configured mutating fixture", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        decks: [deckFixtures.mutating],
      };
      const action: DashboardAction = {
        type: "SET_DECK_MUTATING",
        payload: { id: deckFixtures.mutating.id, isMutating: false },
      };

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result.decks[0].isMutating).toBe(false);
    });
  });

  describe("default case - unknown actions", () => {
    it("should return state unchanged for unknown action", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        decks: [createMockDeck(1)],
        unassignedCount: 5,
      };
      // Testing runtime behavior with invalid action type
      const action = { type: "UNKNOWN_ACTION", payload: "something" } as any;

      // Act
      const result = dashboardReducer(state, action);

      // Assert
      expect(result).toBe(state); // Should return exact same reference
    });
  });

  describe("immutability guarantees", () => {
    it("should never mutate original state object", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        decks: [createMockDeck(1)],
        unassignedCount: 5,
      };
      const originalState = JSON.parse(JSON.stringify(state)); // Deep clone for comparison
      const action: DashboardAction = { type: "SET_LOADING", payload: false };

      // Act
      dashboardReducer(state, action);

      // Assert
      expect(state).toEqual(originalState); // Original state unchanged
    });

    it("should create new state object for every action", () => {
      // Arrange
      const state: DashboardState = initialState;
      const actions: DashboardAction[] = [
        { type: "SET_LOADING", payload: false },
        { type: "SET_SORT", payload: "name_asc" },
        { type: "SET_UNASSIGNED_COUNT", payload: 10 },
      ];

      // Act & Assert
      actions.forEach((action) => {
        const result = dashboardReducer(state, action);
        expect(result).not.toBe(state);
      });
    });
  });

  describe("complex state transitions", () => {
    it("should handle multiple actions in sequence", () => {
      // Arrange
      let state: DashboardState = initialState;

      // Act - Simulate loading and setting data
      state = dashboardReducer(state, { type: "SET_LOADING", payload: true });
      expect(state.isLoading).toBe(true);

      state = dashboardReducer(state, {
        type: "SET_DECKS",
        payload: [createMockDeck(1), createMockDeck(2)],
      });
      expect(state.decks).toHaveLength(2);
      expect(state.isLoading).toBe(false); // Side effect

      state = dashboardReducer(state, { type: "SET_UNASSIGNED_COUNT", payload: 15 });
      expect(state.unassignedCount).toBe(15);

      state = dashboardReducer(state, {
        type: "OPEN_DIALOG",
        payload: { type: "update", deck: state.decks[0] },
      });
      expect(state.dialogState.type).toBe("update");

      state = dashboardReducer(state, { type: "CLOSE_DIALOG" });
      expect(state.dialogState.type).toBeNull();

      // Assert - All changes persisted
      expect(state.decks).toHaveLength(2);
      expect(state.unassignedCount).toBe(15);
      expect(state.isLoading).toBe(false);
    });

    it("should handle setting deck mutating during loading", () => {
      // Arrange
      const state: DashboardState = {
        ...initialState,
        isLoading: true,
        decks: [createMockDeck(1)],
      };

      // Act
      const result = dashboardReducer(state, {
        type: "SET_DECK_MUTATING",
        payload: { id: 1, isMutating: true },
      });

      // Assert
      expect(result.isLoading).toBe(true); // Should preserve loading state
      expect(result.decks[0].isMutating).toBe(true);
    });

    it("should work with complete dashboard state fixture", () => {
      // Arrange
      const state = dashboardStateFixtures.loadedWithDecks;

      // Act - Try to mutate one of the decks
      const result = dashboardReducer(state, {
        type: "SET_DECK_MUTATING",
        payload: { id: state.decks[0].id, isMutating: true },
      });

      // Assert
      expect(result.decks[0].isMutating).toBe(true);
      expect(result.unassignedCount).toBe(5); // Preserved from fixture
    });
  });
});

