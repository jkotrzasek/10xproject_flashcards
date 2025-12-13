import { validateE2EEnvironment } from "../helpers/env";

/**
 * Authentication Fixtures
 * Reusable test data and helpers for authentication tests
 *
 * Credentials are loaded from .env.test file:
 * - E2E_USERNAME_ID - test user UUID
 * - E2E_USERNAME - test user email
 * - E2E_PASSWORD - test user password
 */

export interface TestCredentials {
  userId: string;
  email: string;
  password: string;
}

/**
 * Validate environment variables on module load
 * This will fail fast with clear error message if .env.test is not configured
 */
validateE2EEnvironment();

/**
 * Valid test user credentials from environment variables
 * Make sure .env.test is configured with E2E_USERNAME_ID, E2E_USERNAME and E2E_PASSWORD
 */
export const validUser: TestCredentials = {
  userId: process.env.E2E_USERNAME_ID || "",
  email: process.env.E2E_USERNAME || "",
  password: process.env.E2E_PASSWORD || "",
};

/**
 * Invalid credentials for negative testing
 */
export const invalidUser = {
  email: "nonexistent@example.com",
  password: "WrongPassword999",
};

/**
 * Test data for validation scenarios
 */
export const validationCases = {
  emptyEmail: {
    email: "",
    password: "ValidPassword123",
    expectedError: "wymagany",
  },
  invalidEmailFormat: {
    email: "invalid-email",
    password: "ValidPassword123",
    expectedError: "prawidłowy",
  },
  emptyPassword: {
    email: "test@example.com",
    password: "",
    expectedError: "wymagane",
  },
  spacesInEmail: {
    email: "test @example.com",
    password: "ValidPassword123",
    expectedError: "prawidłowy",
  },
  missingDomain: {
    email: "test@",
    password: "ValidPassword123",
    expectedError: "prawidłowy",
  },
  missingAt: {
    email: "testexample.com",
    password: "ValidPassword123",
    expectedError: "prawidłowy",
  },
};

/**
 * Common test URLs
 */
export const urls = {
  login: "/auth/login",
  register: "/auth/register",
  dashboard: "/",
  confirmEmail: (code: string) => `/auth/login?code=${code}`,
};
