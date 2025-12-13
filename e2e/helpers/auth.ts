import { type Page, expect } from "@playwright/test";
import { LoginPage } from "../page-objects";
import { validUser } from "../fixtures/auth";

/**
 * Helper function to perform complete login flow via UI
 *
 * This function:
 * 1. Navigates to login page with networkidle wait
 * 2. Waits for form to be fully interactive (React hydrated)
 * 3. Fills in credentials from environment variables
 * 4. Submits the form
 * 5. Waits for successful redirect to dashboard
 *
 * @param page - Playwright page instance
 * @throws Will throw an error if login fails or dashboard doesn't load
 *         Error message clearly indicates it's a login flow failure
 *
 * @example
 * ```typescript
 * test.beforeEach(async ({ page }) => {
 *   await loginViaUI(page);
 *   // Now on dashboard
 * });
 * ```
 */
export async function loginViaUI(page: Page): Promise<void> {
  try {
    const loginPage = new LoginPage(page);

    // Navigate to login page (goto already uses networkidle)
    await loginPage.goto();

    // Explicitly wait for form to be fully interactive
    await loginPage.waitForForm();

    // Perform login with credentials from env
    await loginPage.login(validUser.email, validUser.password);

    // Wait for successful redirect to dashboard
    await loginPage.waitForDashboard();

    // Additional verification that dashboard is truly ready
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
  } catch (error) {
    // Re-throw with clear context that this is a login flow failure
    throw new Error(
      `Login flow failed in test setup (beforeEach).\n` +
        `Unable to authenticate user and reach dashboard.\n` +
        `Original error: ${error instanceof Error ? error.message : String(error)}\n\n` +
        `Verify:\n` +
        `- E2E_USERNAME and E2E_PASSWORD are correct in .env.test\n` +
        `- Test user exists in the database\n` +
        `- Login functionality is working`
    );
  }
}
