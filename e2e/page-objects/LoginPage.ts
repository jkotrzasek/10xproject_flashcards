import { type Page, type Locator, expect } from "@playwright/test";

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

  // Validation error elements
  readonly emailError: Locator;
  readonly passwordError: Locator;

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

    // Validation errors
    this.emailError = page.locator("#email-error");
    this.passwordError = page.locator("#password-error");

    // Banners
    this.errorBanner = page.getByTestId("auth-error-banner");
    this.successBanner = page.getByTestId("auth-success-banner");

    // Links
    this.registerLink = page.getByRole("link", { name: /zarejestruj się/i });
  }

  /**
   * Navigate to login page
   * Waits for network to be idle to ensure React hydration is complete
   */
  async goto() {
    await this.page.goto("/auth/login", { waitUntil: "networkidle" });
  }

  /**
   * Wait for login form to be visible and interactive
   * Ensures React hydration is complete before interacting with form
   */
  async waitForForm() {
    await this.form.waitFor({ state: "visible" });
    // Ensure inputs are ready for interaction (React hydrated)
    await this.emailInput.waitFor({ state: "visible" });
    await this.passwordInput.waitFor({ state: "visible" });
    await expect(this.submitButton).toBeEnabled();
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
   * Waits for button to be fully interactive to ensure React hydration is complete
   */
  async submit() {
    // Wait for button to be enabled and visible (ensures React is hydrated)
    await this.submitButton.waitFor({ state: "visible" });
    await this.page.waitForLoadState("networkidle");
    
    // Ensure button is not disabled before clicking
    await expect(this.submitButton).toBeEnabled();
    
    // Click the button
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
   * Accepts both "/" and "" (with or without trailing slash)
   */
  async waitForDashboard() {
    await this.page.waitForURL(
      (url) => url.pathname === "/" || url.pathname === "",
      { waitUntil: "networkidle" }
    );
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
   * Wait for email validation error to appear
   * Use this instead of hasEmailError() for reliable assertions
   */
  async waitForEmailError() {
    await this.emailError.waitFor({ state: "visible" });
  }

  /**
   * Wait for password validation error to appear
   * Use this instead of hasPasswordError() for reliable assertions
   */
  async waitForPasswordError() {
    await this.passwordError.waitFor({ state: "visible" });
  }

  /**
   * Check if email field has validation error (immediate check)
   * @deprecated Use expectEmailError() or waitForEmailError() for reliable assertions
   */
  async hasEmailError() {
    return await this.emailError.isVisible();
  }

  /**
   * Check if password field has validation error (immediate check)
   * @deprecated Use expectPasswordError() or waitForPasswordError() for reliable assertions
   */
  async hasPasswordError() {
    return await this.passwordError.isVisible();
  }

  /**
   * Get email field validation error text
   * Waits for error element to be visible before reading
   */
  async getEmailError() {
    await this.emailError.waitFor({ state: "visible" });
    return await this.emailError.textContent();
  }

  /**
   * Get password field validation error text
   * Waits for error element to be visible before reading
   */
  async getPasswordError() {
    await this.passwordError.waitFor({ state: "visible" });
    return await this.passwordError.textContent();
  }

  /**
   * Trigger validation on email input by focusing and blurring
   * Waits for React state to update
   */
  async triggerEmailValidation() {
    await this.emailInput.focus();
    await this.emailInput.blur();
    // Small delay for React state update
    await this.page.waitForTimeout(100);
  }

  /**
   * Trigger validation on password input by focusing and blurring
   * Waits for React state to update
   */
  async triggerPasswordValidation() {
    await this.passwordInput.focus();
    await this.passwordInput.blur();
    // Small delay for React state update
    await this.page.waitForTimeout(100);
  }
}
