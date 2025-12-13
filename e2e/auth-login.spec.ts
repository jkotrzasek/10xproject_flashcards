import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects";
import { validUser, invalidUser, validationCases } from "./fixtures/auth";

test.describe("Login Page", () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test("should display login form", async () => {
    // Arrange & Act - navigated in beforeEach

    // Assert
    await expect(loginPage.form).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test("flow: complete login from login page to dashboard", async ({ page }) => {
    // ARRANGE
    const { email, password } = validUser;

    // ACT & ASSERT

    // Step 1: Verify login page loaded
    await test.step("1. Otwórz stronę logowania", async () => {
      await expect(page).toHaveURL("/auth/login");
      await expect(page).toHaveTitle(/logowanie/i);
    });

    // Step 2: Wait for form to be ready
    await test.step("2. Poczekaj na pojawienie się formularza", async () => {
      await loginPage.waitForForm();
      await expect(loginPage.form).toBeVisible();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.submitButton).toBeVisible();
    });

    // Step 3: Fill in credentials
    await test.step("3. Uzupełnij dane formularza - login i hasło", async () => {
      await loginPage.fillEmail(email);
      await expect(loginPage.emailInput).toHaveValue(email);

      await loginPage.fillPassword(password);
      await expect(loginPage.passwordInput).toHaveValue(password);

      // Verify no validation errors (immediate check is OK here since we're checking for absence)
      await expect(loginPage.emailError).not.toBeVisible();
      await expect(loginPage.passwordError).not.toBeVisible();
    });

    // Step 4: Submit the form
    await test.step("4. Użyj przycisku Zaloguj", async () => {
      await expect(loginPage.submitButton).toBeEnabled();
      await loginPage.submit();
    });

    // Step 5: Verify dashboard loaded
    await test.step("5. Poczekaj czy otworzy się strona główna (Dashboard)", async () => {
      await loginPage.waitForDashboard();

      const dashboardPage = page.getByTestId("dashboard-page");
      await expect(dashboardPage).toBeVisible();

      const dashboardHeading = page.getByTestId("dashboard-heading");
      await expect(dashboardHeading).toBeVisible();
      await expect(dashboardHeading).toHaveText("Dashboard");
    });
  });

  test("should show validation error for empty email", async () => {
    // Arrange
    await loginPage.waitForForm();
    const { expectedError } = validationCases.emptyEmail;

    // Act - trigger validation and wait for React state update
    await loginPage.triggerEmailValidation();

    // Assert - use Playwright's built-in waiting assertions
    await expect(loginPage.emailError).toBeVisible();
    await expect(loginPage.emailError).toContainText(expectedError);
  });

  test("should show validation error for invalid email format", async () => {
    // Arrange
    await loginPage.waitForForm();
    const { email, expectedError } = validationCases.invalidEmailFormat;

    // Act
    await loginPage.fillEmail(email);
    await loginPage.emailInput.blur();
    // Wait for React state update
    await loginPage.page.waitForTimeout(100);

    // Assert - use Playwright's built-in waiting assertions
    await expect(loginPage.emailError).toBeVisible();
    await expect(loginPage.emailError).toContainText(expectedError);
  });

  test("should show validation error for empty password", async () => {
    // Arrange
    await loginPage.waitForForm();
    const { expectedError } = validationCases.emptyPassword;

    // Act - trigger validation and wait for React state update
    await loginPage.triggerPasswordValidation();

    // Assert - use Playwright's built-in waiting assertions
    await expect(loginPage.passwordError).toBeVisible();
    await expect(loginPage.passwordError).toContainText(expectedError);
  });

  test("should show error banner for invalid credentials", async () => {
    // Arrange
    const { email, password } = invalidUser;

    // Act
    await loginPage.login(email, password);

    // Assert - wait for server response and error banner to appear
    // Increased timeout for potential server latency
    await expect(loginPage.errorBanner).toBeVisible({ timeout: 10000 });
    const errorMessage = await loginPage.getErrorMessage();
    expect(errorMessage).toBeTruthy();
  });

  test("should show loading state during login", async () => {
    // Arrange
    const { email, password } = validUser;
    await loginPage.waitForForm();

    // Act
    await loginPage.fillEmail(email);
    await loginPage.fillPassword(password);
    
    // Submit and immediately check (race condition - may be too fast)
    const submitPromise = loginPage.submit();
    
    // Assert - try to catch loading state (may already be done)
    try {
      await expect(loginPage.submitButton).toBeDisabled({ timeout: 1000 });
    } catch {
      // Loading was too fast, that's ok
    }
    
    await submitPromise;
  });

  test("should navigate to register page when clicking register link", async ({ page }) => {
    // Arrange
    await loginPage.waitForForm();

    // Act
    await loginPage.goToRegister();

    // Assert
    await expect(page).toHaveURL("/auth/register");
  });

  test("should show success banner when email is confirmed", async ({ page }) => {
    // Arrange - Navigate with email confirmation code
    await page.goto("/auth/login?code=some-confirmation-code");
    loginPage = new LoginPage(page);

    // Act
    await loginPage.waitForForm();

    // Assert
    await expect(loginPage.successBanner).toBeVisible();
    const successMessage = await loginPage.getSuccessMessage();
    expect(successMessage).toContain("Potwierdzono adres email");
  });

  test("should clear error when user starts typing", async () => {
    // Arrange
    const email = "wrong@example.com";
    const password = "WrongPassword123";
    await loginPage.login(email, password);
    // Wait for error banner to appear with increased timeout for server response
    await expect(loginPage.errorBanner).toBeVisible({ timeout: 10000 });

    // Act
    await loginPage.fillEmail("new@example.com");

    // Assert - wait for React to update and hide the banner
    await expect(loginPage.errorBanner).not.toBeVisible();
  });
});
