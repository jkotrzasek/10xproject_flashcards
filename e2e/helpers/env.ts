/**
 * Environment Variables Helper
 * Validates and provides typed access to test environment variables
 */

export interface E2EEnvironment {
  userId: string;
  username: string;
  password: string;
}

/**
 * Get required environment variable
 * Throws error if not set
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}\n` +
      `Please make sure .env.test file exists and contains ${key}`
    );
  }
  return value;
}

/**
 * Load and validate E2E environment variables
 */
export function loadE2EEnvironment(): E2EEnvironment {
  return {
    userId: getRequiredEnv("E2E_USERNAME_ID"),
    username: getRequiredEnv("E2E_USERNAME"),
    password: getRequiredEnv("E2E_PASSWORD"),
  };
}

/**
 * Validate that all required environment variables are set
 * Call this early in test setup to fail fast with clear error message
 */
export function validateE2EEnvironment(): void {
  const required = ["E2E_USERNAME_ID", "E2E_USERNAME", "E2E_PASSWORD"];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n\n` +
      `Please create .env.test file with:\n` +
      `E2E_USERNAME_ID=user-uuid-here\n` +
      `E2E_USERNAME=your-test-email@example.com\n` +
      `E2E_PASSWORD=your-test-password\n\n` +
      `You can copy .env.test.example as a starting point.`
    );
  }
}
