import { chromium, type FullConfig } from "@playwright/test";

/**
 * Global setup for Playwright tests.
 * Runs once before all tests.
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;

  // Launch browser and wait for the server to be ready
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Wait for the dev server to be ready
    await page.goto(baseURL || "http://localhost:4321", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    console.log("Server is ready");
  } catch (error) {
    console.error("Failed to connect to server:", error);
    throw error;
  } finally {
    await page.close();
    await browser.close();
  }
}

export default globalSetup;
