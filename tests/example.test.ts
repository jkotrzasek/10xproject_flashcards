import { describe, it, expect } from "vitest";

/**
 * Example test file demonstrating Vitest setup.
 * Delete this file once you have real tests.
 */
describe("Example Test Suite", () => {
  it("should run basic test", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle async operations", async () => {
    const result = await Promise.resolve("test");
    expect(result).toBe("test");
  });
});
