import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Dashboard Page
 * Represents the main dashboard view with deck management functionality
 */
export class DashboardPage {
  readonly page: Page;

  // Page container
  readonly container: Locator;
  readonly heading: Locator;

  // Header elements
  readonly createDeckButton: Locator;

  // Empty state elements
  readonly createFirstDeckButton: Locator;
  readonly generateFlashcardsButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page elements
    this.container = page.getByTestId("dashboard-page");
    this.heading = page.getByTestId("dashboard-heading");

    // Header
    this.createDeckButton = page.getByTestId("create-deck-button");

    // Empty states
    this.createFirstDeckButton = page.getByTestId("create-first-deck-button");
    this.generateFlashcardsButton = page.getByTestId("generate-flashcards-button");
  }

  /**
   * Navigate to dashboard page
   * Waits for network to be idle to ensure React hydration is complete
   */
  async goto() {
    await this.page.goto("/", { waitUntil: "networkidle" });
  }

  /**
   * Wait for dashboard page to be fully loaded
   * Checks for dashboard URL (accepts both "/" and "") and heading visibility
   * Ensures React hydration is complete before proceeding
   */
  async waitForLoad() {
    await this.page.waitForURL((url) => url.pathname === "/" || url.pathname === "", { waitUntil: "networkidle" });
    await this.container.waitFor({ state: "visible" });
    await this.heading.waitFor({ state: "visible" });
    // Ensure header button is ready for interaction
    await expect(this.createDeckButton).toBeEnabled();
  }

  /**
   * Check if dashboard is visible
   */
  async isVisible() {
    return await this.container.isVisible();
  }

  /**
   * Check if empty state button is visible
   * Waits for page load and checks if "Create First Deck" button is available
   * Returns false if button is not visible (e.g., when decks already exist)
   *
   * @param timeout - Optional timeout in milliseconds (default: 5000)
   * @returns Promise<boolean> - true if button is visible, false otherwise
   */
  async isEmptyStateVisible(timeout = 5000): Promise<boolean> {
    try {
      await this.createFirstDeckButton.waitFor({
        state: "visible",
        timeout,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Open create deck dialog using header button
   * Waits for button to be ready before clicking
   */
  async openCreateDeckDialog() {
    await expect(this.createDeckButton).toBeEnabled();
    await this.createDeckButton.click();
  }

  /**
   * Open create deck dialog using empty state button
   * Waits for button to be ready before clicking
   */
  async openCreateDeckDialogFromEmptyState() {
    await expect(this.createFirstDeckButton).toBeEnabled();
    await this.createFirstDeckButton.click();
  }

  /**
   * Get deck card by ID
   * @param deckId - The ID of the deck
   */
  getDeckCard(deckId: number) {
    return new DeckCard(this.page, deckId);
  }

  /**
   * Get all visible deck cards
   */
  async getAllDeckCards() {
    const cards = await this.page.getByTestId(/^deck-card-\d+$/).all();
    return cards;
  }

  /**
   * Wait for deck card to appear
   * @param deckId - The ID of the deck to wait for
   */
  async waitForDeckCard(deckId: number) {
    await this.page.getByTestId(`deck-card-${deckId}`).waitFor({ state: "visible" });
  }

  /**
   * Wait for deck card with specific name to appear
   * Uses exact text match to avoid false positives when multiple decks exist
   *
   * @param deckName - The exact name of the deck to wait for
   * @param timeout - Optional timeout in milliseconds (default: 10000)
   */
  async waitForDeckCardByName(deckName: string, timeout = 10000) {
    // Use getByText for exact match within deck card name elements
    const deckCard = this.page
      .getByTestId("deck-card-name")
      .filter({ hasText: new RegExp(`^${deckName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });
    await deckCard.first().waitFor({ state: "visible", timeout });
  }
}

/**
 * Page Object Model for Deck Card Component
 * Represents individual deck card on dashboard
 */
export class DeckCard {
  readonly page: Page;
  readonly deckId: number;
  readonly card: Locator;

  // Card elements
  readonly name: Locator;
  readonly editButton: Locator;
  readonly deleteButton: Locator;
  readonly learnButton: Locator;

  constructor(page: Page, deckId: number) {
    this.page = page;
    this.deckId = deckId;
    this.card = page.getByTestId(`deck-card-${deckId}`);

    // Elements within the card
    this.name = this.card.getByTestId("deck-card-name");
    this.editButton = this.card.getByTestId("edit-deck-button");
    this.deleteButton = this.card.getByTestId("delete-deck-button");
    this.learnButton = this.card.getByTestId("learn-deck-button");
  }

  /**
   * Click on deck name to open deck details
   */
  async openDeckDetails() {
    await this.name.click();
  }

  /**
   * Click on learn button to start learning session
   */
  async startLearning() {
    await this.learnButton.click();
  }

  /**
   * Click on edit button to open edit dialog
   */
  async openEditDialog() {
    await this.editButton.click();
  }

  /**
   * Click on delete button to open delete confirmation dialog
   */
  async openDeleteDialog() {
    await this.deleteButton.click();
  }

  /**
   * Get deck name text
   */
  async getName() {
    return await this.name.textContent();
  }

  /**
   * Check if card is visible
   */
  async isVisible() {
    return await this.card.isVisible();
  }
}
