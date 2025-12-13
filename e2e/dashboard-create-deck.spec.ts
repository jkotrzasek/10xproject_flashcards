import { test, expect } from "@playwright/test";
import { DashboardPage, CreateDeckDialog } from "./page-objects";
import { loginViaUI } from "./helpers/auth";
import { generateUniqueDeckName } from "./helpers/testData";

/**
 * E2E Test Suite: Dashboard - Create Deck Flow
 * Tests the complete flow of creating a new deck from the dashboard
 */
test.describe("Dashboard - Create Deck", () => {
  let dashboardPage: DashboardPage;
  let createDeckDialog: CreateDeckDialog;

  test.beforeEach(async ({ page }) => {
    // Arrange - Login via UI to reach dashboard
    // This will throw clear error if login fails
    await loginViaUI(page);

    // Initialize page objects
    dashboardPage = new DashboardPage(page);
    createDeckDialog = new CreateDeckDialog(page);

    // Navigate to dashboard (universal approach for all page tests)
    await dashboardPage.goto();

    // Wait for dashboard to fully load
    await dashboardPage.waitForLoad();
  });

  test("should create a new deck using empty state button", async () => {
    // Arrange - Check if empty state is visible
    const isEmptyState = await dashboardPage.isEmptyStateVisible();

    // Skip test if button is not visible (decks already exist)
    test.skip(!isEmptyState, "Empty state button not visible - decks already exist");

    const deckName = generateUniqueDeckName("MyFirstDeck");

    // Act - Open dialog from empty state
    await dashboardPage.openCreateDeckDialogFromEmptyState();

    // Assert - Dialog is visible
    await expect(createDeckDialog.dialog).toBeVisible();

    // Act - Fill and save
    await createDeckDialog.fillDeckName(deckName);
    await createDeckDialog.save();

    // Assert - Dialog closes and deck appears
    await createDeckDialog.waitForDialogToClose();
    await dashboardPage.waitForDeckCardByName(deckName);
  });

  test("should create a new deck using header button", async () => {
    // Arrange
    const deckName = generateUniqueDeckName("TestDeck");

    // Act - Open dialog
    await dashboardPage.openCreateDeckDialog();

    // Assert - Dialog is visible
    await expect(createDeckDialog.dialog).toBeVisible();

    // Act - Fill and save
    await createDeckDialog.createDeck(deckName);

    // Assert - Dialog closes and deck appears
    await createDeckDialog.waitForDialogToClose();
    await dashboardPage.waitForDeckCardByName(deckName);
  });

  test("should cancel deck creation", async () => {
    // Arrange
    await dashboardPage.openCreateDeckDialog();
    await createDeckDialog.waitForDialog();

    // Act - Fill name but cancel
    await createDeckDialog.fillDeckName("Cancelled Deck");
    await createDeckDialog.cancel();

    // Assert - Dialog closes without creating deck
    await createDeckDialog.waitForDialogToClose();
    await expect(createDeckDialog.dialog).not.toBeVisible();
  });

  test("should show validation error for empty deck name", async () => {
    // Arrange
    await dashboardPage.openCreateDeckDialog();
    await createDeckDialog.waitForDialog();

    // Act - Try to save without filling name
    await createDeckDialog.save();

    // Assert - Dialog remains visible (validation error should appear)
    await expect(createDeckDialog.dialog).toBeVisible();

    // Assert - Error message is displayed
    const errorMessage = createDeckDialog.page.getByText(/Nazwa decku nie może być pusta/i);
    await expect(errorMessage).toBeVisible();
  });

  test("should validate deck name length", async () => {
    // Arrange
    await dashboardPage.openCreateDeckDialog();
    await createDeckDialog.waitForDialog();

    // Act - Try to enter name longer than 30 characters
    const longName = "a".repeat(31);
    await createDeckDialog.fillDeckName(longName);

    // Assert - Input should limit to 30 characters
    const actualValue = await createDeckDialog.getNameValue();
    expect(actualValue.length).toBeLessThanOrEqual(30);
  });

  test("should interact with created deck card", async () => {
    // Arrange - Create a deck first
    const deckName = generateUniqueDeckName("IntTestDeck");
    await dashboardPage.openCreateDeckDialog();
    await createDeckDialog.createDeck(deckName);
    await createDeckDialog.waitForDialogToClose();
    await dashboardPage.waitForDeckCardByName(deckName);

    // Act - Get the deck card (assuming it's ID 1 for example, or find by name)
    const allCards = await dashboardPage.getAllDeckCards();
    expect(allCards.length).toBeGreaterThan(0);

    // Assert - Deck card elements are visible
    const firstCard = allCards[0];
    await expect(firstCard).toBeVisible();
  });
});
