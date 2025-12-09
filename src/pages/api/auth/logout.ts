import type { APIRoute } from "astro";
import { mapSupabaseAuthError } from "../../../lib/errors/authErrors";
import type { AuthErrorDto } from "../../../types";

export const prerender = false;

/**
 * POST /api/auth/logout
 * Signs out the currently authenticated user by invalidating their session.
 * 
 * @returns 200 - Successfully logged out (cookies cleared)
 * @returns 401 - Logout failed (error from Supabase Auth)
 * @returns 500 - Server error
 * 
 * Flow:
 * 1. Call Supabase Auth signOut() to invalidate session
 * 2. Cookies are automatically cleared by Supabase client via setAll
 * 3. Return success response
 * 
 * Error handling:
 * - 401: Session invalidation failed
 * - 500: Server/database errors
 * 
 * Security:
 * - Requires active session (middleware redirects unauthenticated users)
 * - Clears all session cookies on success
 */
export const POST: APIRoute = async ({ locals }) => {
  const supabase = locals.supabase;

  try {
    // Sign out from Supabase Auth
    // This invalidates the session and triggers cookie cleanup via setAll
    const { error: signOutError } = await supabase.auth.signOut();

    // Handle sign-out errors
    if (signOutError) {
      const authError = mapSupabaseAuthError(signOutError);
      return new Response(JSON.stringify(authError), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success - session invalidated and cookies cleared
    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    // Log error for debugging (don't expose to user)
    console.error("Unexpected error in POST /api/auth/logout:", error);

    // Map to user-friendly error
    const authError = mapSupabaseAuthError(error);

    return new Response(JSON.stringify(authError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

