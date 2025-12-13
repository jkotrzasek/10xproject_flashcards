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
  console.log('\n🧹 Starting E2E database cleanup...');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const testUsername = process.env.E2E_USERNAME;
  const testPassword = process.env.E2E_PASSWORD;
  const testUserId = process.env.E2E_USERNAME_ID;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY in .env.test');
    throw new Error('Missing Supabase credentials in environment variables');
  }

  if (!testUsername || !testPassword) {
    console.warn('⚠️  Missing E2E_USERNAME or E2E_PASSWORD - will use E2E_USERNAME_ID fallback');
  }

  if (!testUserId) {
    console.error('❌ Missing E2E_USERNAME_ID in .env.test');
    throw new Error('E2E_USERNAME_ID is required for cleanup fallback');
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  let userId: string | null = null;
  let authMethod: 'authenticated' | 'fallback' = 'fallback';

  // Strategy 1: Try to authenticate and get user from session
  if (testUsername && testPassword) {
    try {
      console.log('🔐 Attempting to authenticate test user...');
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: testUsername,
        password: testPassword,
      });

      if (!signInError) {
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (!userError && user) {
          userId = user.id;
          authMethod = 'authenticated';
          console.log(`✅ Authenticated successfully as: ${user.email}`);
        } else {
          console.warn('⚠️  Auth succeeded but failed to get user, using fallback');
        }
      } else {
        console.warn('⚠️  Authentication failed, using fallback');
        console.warn(`   Reason: ${signInError.message}`);
      }
    } catch (error) {
      console.warn('⚠️  Authentication error, using fallback');
      console.warn(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Strategy 2: Fallback to E2E_USERNAME_ID from environment
  if (!userId) {
    userId = testUserId;
    console.log(`🔑 Using E2E_USERNAME_ID fallback: ${userId}`);
  }

  console.log(`👤 Cleaning up data for user_id: ${userId} (method: ${authMethod})`);

  // Delete all decks for the user (flashcards cascade delete via FK)
  const { data: deletedDecks, error: deleteError } = await supabase
    .from('decks')
    .delete()
    .eq('user_id', userId)
    .select();

  if (deleteError) {
    console.error('❌ Error deleting decks:', deleteError);
    throw deleteError;
  }

  const deckCount = deletedDecks?.length || 0;
  console.log(`🗑️  Deleted ${deckCount} deck(s)`);

  // Sign out if we authenticated
  if (authMethod === 'authenticated') {
    await supabase.auth.signOut();
    console.log('🔓 Signed out');
  }

  console.log('✅ E2E database cleanup completed successfully\n');
});
