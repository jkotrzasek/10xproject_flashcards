import { test as teardown } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

/**
 * E2E Database Cleanup - Global Teardown
 *
 * Runs automatically after all tests via project dependencies.
 * Configured in playwright.config.ts as 'cleanup db' project.
 *
 * Strategy:
 * 1. Try to authenticate with E2E test user credentials
 * 2. If auth succeeds, get user.id from session (preferred, more secure)
 * 3. If auth fails, fallback to E2E_USERNAME_ID from .env.test
 * 4. Delete all decks for that user_id (cascades to flashcards)
 *
 * Required environment variables (from .env.test):
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_KEY: Supabase anon key
 * - E2E_USERNAME: Test user email (for auth attempt)
 * - E2E_PASSWORD: Test user password (for auth attempt)
 * - E2E_USERNAME_ID: Test user UUID (fallback if auth fails)
 */
teardown("cleanup database after E2E tests", async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const testUsername = process.env.E2E_USERNAME;
  const testPassword = process.env.E2E_PASSWORD;
  const testUserId = process.env.E2E_USERNAME_ID;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_KEY in .env.test");
  }

  if (!testUserId) {
    throw new Error("E2E_USERNAME_ID is required for cleanup fallback");
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  let userId: string | null = null;
  let authMethod: "authenticated" | "fallback" = "fallback";

  // Strategy 1: Try to authenticate and get user from session
  if (testUsername && testPassword) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: testUsername,
      password: testPassword,
    });

    if (!signInError) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        userId = user.id;
        authMethod = "authenticated";
      }
    }
  }

  // Strategy 2: Fallback to E2E_USERNAME_ID from environment
  if (!userId) {
    userId = testUserId;
  }

  // Delete all decks for the user (flashcards cascade delete via FK)
  const { error: deleteError } = await supabase.from("decks").delete().eq("user_id", userId);

  if (deleteError) {
    throw new Error(`Failed to delete decks for user ${userId}: ${deleteError.message}`);
  }

  // Sign out if we authenticated
  if (authMethod === "authenticated") {
    await supabase.auth.signOut();
  }
});
