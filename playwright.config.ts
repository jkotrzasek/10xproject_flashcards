import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

/**
 * Load test environment variables from .env.test
 *
 * Required E2E variables:
 * - E2E_USERNAME_ID: Test user UUID
 * - E2E_USERNAME: Test user email address
 * - E2E_PASSWORD: Test user password
 *
 * Additional application variables (SUPABASE_URL, OPENROUTER_API_KEY, etc.)
 * are also loaded from .env.test for the test environment.
 *
 * To setup:
 * 1. Copy .env.test.example to .env.test
 * 2. Fill in your test credentials and application config
 * 3. Ensure test user exists in database
 * 4. Verify: npm run test:e2e:verify
 */
dotenv.config({ path: path.resolve(process.cwd(), ".env.test") });

/**
 * Playwright Test Configuration
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? "github" : "html",
  /* Global timeout for each test */
  timeout: 60 * 1000,
  /* Expect timeout - increased for server cold starts and React hydration */
  expect: {
    timeout: 10 * 1000,
  },
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
    /* Screenshot on failure */
    screenshot: "only-on-failure",
    /* Video on failure */
    video: "retain-on-failure",
    /* Navigation timeout - increased for server cold starts */
    navigationTimeout: 30 * 1000,
    /* Action timeout */
    actionTimeout: 15 * 1000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "setup db",
      testMatch: /global\.setup\.ts/,
      teardown: "cleanup db",
    },
    {
      name: "cleanup db",
      testMatch: /global\.teardown\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["setup db"],
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
