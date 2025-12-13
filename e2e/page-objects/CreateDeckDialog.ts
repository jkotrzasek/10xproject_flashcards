import { type Page, type Locator, expect } from "@playwright/test";

/**
 * Page Object Model for Create Deck Dialog
 * Represents the dialog for creating a new deck
 */
export class CreateDeckDialog {
  readonly page: Page;

  // Dialog elements
  readonly dialog: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.dialog = page.getByTestId("create-deck-dialog");
    this.nameInput = page.getByTestId("deck-name-input");
    this.saveButton = page.getByTestId("save-deck-button");
    this.cancelButton = page.getByTestId("cancel-deck-button");
  }

  /**
   * Wait for dialog to be visible and interactive
   * Ensures React hydration is complete
   */
  async waitForDialog() {
    await this.dialog.waitFor({ state: "visible" });
    await this.nameInput.waitFor({ state: "visible" });
    await expect(this.saveButton).toBeVisible();
    await expect(this.cancelButton).toBeVisible();
  }

  /**
   * Wait for dialog to be hidden
   */
  async waitForDialogToClose() {
    await this.dialog.waitFor({ state: "hidden" });
  }

  /**
   * Fill deck name input
   * Waits for input to be ready before filling
   * @param name - The name to enter
   */
  async fillDeckName(name: string) {
    await this.nameInput.waitFor({ state: "visible" });
    await this.nameInput.fill(name);
  }

  /**
   * Click save button to create deck
   * Waits for button to be enabled before clicking
   */
  async save() {
    await expect(this.saveButton).toBeEnabled();
    await this.saveButton.click();
  }

  /**
   * Click cancel button to close dialog
   * Waits for button to be enabled before clicking
   */
  async cancel() {
    await expect(this.cancelButton).toBeEnabled();
    await this.cancelButton.click();
  }

  /**
   * Complete flow: fill name and save
   * @param name - The name of the deck to create
   */
  async createDeck(name: string) {
    await this.waitForDialog();
    await this.fillDeckName(name);
    await this.save();
  }

  /**
   * Check if dialog is visible
   */
  async isVisible() {
    return await this.dialog.isVisible();
  }

  /**
   * Get current value of name input
   */
  async getNameValue() {
    return await this.nameInput.inputValue();
  }

  /**
   * Check if save button is disabled
   */
  async isSaveButtonDisabled() {
    return await this.saveButton.isDisabled();
  }
}
