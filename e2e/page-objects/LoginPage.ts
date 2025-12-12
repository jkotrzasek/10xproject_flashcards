import { type Page, type Locator } from "@playwright/test";

/**
 * Page Object Model for Login Page
 * Represents the authentication login view
 */
export class LoginPage {
  readonly page: Page;

  // Form elements
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;

  // Banner elements
  readonly errorBanner: Locator;
  readonly successBanner: Locator;

  // Links
  readonly registerLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Form
    this.form = page.getByTestId("login-form");
    this.emailInput = page.getByTestId("login-email-input");
    this.passwordInput = page.getByTestId("login-password-input");
    this.submitButton = page.getByTestId("login-submit-button");

    // Banners
    this.errorBanner = page.getByTestId("auth-error-banner");
    this.successBanner = page.getByTestId("auth-success-banner");

    // Links
    this.registerLink = page.getByRole("link", { name: /zarejestruj się/i });
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto("/auth/login");
  }

  /**
   * Wait for login form to be visible
   */
  async waitForForm() {
    await this.form.waitFor({ state: "visible" });
  }

  /**
   * Fill email input
   * @param email - The email address to enter
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill password input
   * @param password - The password to enter
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click submit button to log in
   */
  async submit() {
    await this.submitButton.click();
  }

  /**
   * Complete login flow: fill credentials and submit
   * @param email - User email
   * @param password - User password
   */
  async login(email: string, password: string) {
    await this.waitForForm();
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Wait for successful redirect to dashboard
   * Checks for dashboard page URL and heading
   */
  async waitForDashboard() {
    await this.page.waitForURL("/", { waitUntil: "load" });
    await this.page.getByTestId("dashboard-heading").waitFor({ state: "visible" });
  }

  /**
   * Check if form is visible
   */
  async isFormVisible() {
    return await this.form.isVisible();
  }

  /**
   * Check if submit button is disabled
   */
  async isSubmitButtonDisabled() {
    return await this.submitButton.isDisabled();
  }

  /**
   * Check if error banner is visible
   */
  async isErrorBannerVisible() {
    return await this.errorBanner.isVisible();
  }

  /**
   * Check if success banner is visible
   */
  async isSuccessBannerVisible() {
    return await this.successBanner.isVisible();
  }

  /**
   * Get error banner text content
   */
  async getErrorMessage() {
    return await this.errorBanner.textContent();
  }

  /**
   * Get success banner text content
   */
  async getSuccessMessage() {
    return await this.successBanner.textContent();
  }

  /**
   * Get current email input value
   */
  async getEmailValue() {
    return await this.emailInput.inputValue();
  }

  /**
   * Get current password input value
   */
  async getPasswordValue() {
    return await this.passwordInput.inputValue();
  }

  /**
   * Wait for submit button to show loading state
   * Note: This may be too fast to catch on localhost
   */
  async waitForLoadingState() {
    try {
      await this.submitButton.getByText(/logowanie\.\.\./i).waitFor({ 
        state: "visible",
        timeout: 2000 
      });
    } catch {
      // Loading state passed too quickly - acceptable on fast connections
      return;
    }
  }

  /**
   * Click on register link to navigate to registration
   */
  async goToRegister() {
    await this.registerLink.click();
  }

  /**
   * Check if email field has validation error
   */
  async hasEmailError() {
    return await this.page.locator("#email-error").isVisible();
  }

  /**
   * Check if password field has validation error
   */
  async hasPasswordError() {
    return await this.page.locator("#password-error").isVisible();
  }

  /**
   * Get email field validation error text
   */
  async getEmailError() {
    return await this.page.locator("#email-error").textContent();
  }

  /**
   * Get password field validation error text
   */
  async getPasswordError() {
    return await this.page.locator("#password-error").textContent();
  }
}
