import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects";
import { validUser } from "./fixtures/auth";

test.describe("Login Flow - E2E Scenario", () => {
  test("complete login flow: from login page to dashboard", async ({ page }) => {
    // ARRANGE
    const loginPage = new LoginPage(page);
    const { email, password } = validUser;

    // ACT & ASSERT

    // 1. Otwórz stronę logowania
    await loginPage.goto();
    await expect(page).toHaveURL("/auth/login");

    // 2. Poczekaj na pojawienie się formularza
    await loginPage.waitForForm();
    await expect(loginPage.form).toBeVisible();

    // 3. Uzupełnij dane formularza - login i hasło
    await loginPage.fillEmail(email);
    await expect(loginPage.emailInput).toHaveValue(email);

    await loginPage.fillPassword(password);
    await expect(loginPage.passwordInput).toHaveValue(password);

    // 4. Użyj przycisku Zaloguj
    await expect(loginPage.submitButton).toBeEnabled();
    await loginPage.submit();

    // 5. Poczekaj czy otworzy się strona główna (Dashboard)
    await loginPage.waitForDashboard();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("dashboard-heading")).toBeVisible();
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
  });

  test("complete login flow with step-by-step validation", async ({ page }) => {
    // ARRANGE
    const loginPage = new LoginPage(page);
    const { email, password } = validUser;

    // ACT & ASSERT

    // Step 1: Navigate to login page
    await test.step("1. Otwórz stronę logowania", async () => {
      await loginPage.goto();
      await expect(page).toHaveURL("/auth/login");
      await expect(page).toHaveTitle(/logowanie/i);
    });

    // Step 2: Wait for form to be ready
    await test.step("2. Poczekaj na pojawienie się formularza", async () => {
      await loginPage.waitForForm();
      expect(await loginPage.isFormVisible()).toBe(true);
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    // Step 3: Fill in credentials
    await test.step("3. Uzupełnij dane formularza - login i hasło", async () => {
      // Fill email
      await loginPage.fillEmail(email);
      expect(await loginPage.getEmailValue()).toBe(email);

      // Fill password
      await loginPage.fillPassword(password);
      expect(await loginPage.getPasswordValue()).toBe(password);

      // Verify no validation errors
      expect(await loginPage.hasEmailError()).toBe(false);
      expect(await loginPage.hasPasswordError()).toBe(false);
    });

    // Step 4: Submit the form
    await test.step("4. Użyj przycisku Zaloguj", async () => {
      expect(await loginPage.isSubmitButtonDisabled()).toBe(false);
      await loginPage.submit();
    });

    // Step 5: Verify dashboard loaded
    await test.step("5. Poczekaj czy otworzy się strona główna (Dashboard)", async () => {
      await loginPage.waitForDashboard();

      // Verify URL
      await expect(page).toHaveURL("/");

      // Verify dashboard elements
      const dashboardPage = page.getByTestId("dashboard-page");
      await expect(dashboardPage).toBeVisible();

      const dashboardHeading = page.getByTestId("dashboard-heading");
      await expect(dashboardHeading).toBeVisible();
      await expect(dashboardHeading).toHaveText("Dashboard");
    });
  });

  test("login flow with all interactive checks", async ({ page }) => {
    // ARRANGE
    const loginPage = new LoginPage(page);
    const credentials = validUser;

    // 1. Open login page and verify
    await loginPage.goto();
    await expect(page.getByRole("heading", { name: /witaj ponownie/i })).toBeVisible();

    // 2. Wait for form
    await loginPage.waitForForm();
    expect(await loginPage.isFormVisible()).toBe(true);

    // 3. Interact with form fields
    await loginPage.fillEmail(credentials.email);
    await loginPage.emailInput.press("Tab");

    await loginPage.fillPassword(credentials.password);
    await loginPage.passwordInput.press("Tab");

    // Verify filled values
    expect(await loginPage.getEmailValue()).toBe(credentials.email);
    expect(await loginPage.getPasswordValue()).toBe(credentials.password);

    // 4. Click login button
    await loginPage.submitButton.click();

    // 5. Wait for successful navigation
    await page.waitForURL("/", { timeout: 5000 });
    await expect(page.getByTestId("dashboard-heading")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("dashboard-page")).toBeVisible();
  });
});
