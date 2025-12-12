import { type Page, type Locator } from "@playwright/test";

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
   */
  async goto() {
    await this.page.goto("/");
  }

  /**
   * Wait for dashboard page to be fully loaded
   */
  async waitForLoad() {
    await this.container.waitFor({ state: "visible" });
    await this.heading.waitFor({ state: "visible" });
  }

  /**
   * Check if dashboard is visible
   */
  async isVisible() {
    return await this.container.isVisible();
  }

  /**
   * Open create deck dialog using header button
   */
  async openCreateDeckDialog() {
    await this.createDeckButton.click();
  }

  /**
   * Open create deck dialog using empty state button
   */
  async openCreateDeckDialogFromEmptyState() {
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
   * @param deckName - The name of the deck to wait for
   */
  async waitForDeckCardByName(deckName: string) {
    await this.page.getByTestId("deck-card-name").filter({ hasText: deckName }).first().waitFor({ state: "visible" });
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
