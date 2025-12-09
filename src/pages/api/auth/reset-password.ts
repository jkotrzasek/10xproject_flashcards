import type { APIRoute } from "astro";
import { resetPasswordSchema } from "../../../lib/validation/authSchemas";
import { mapSupabaseAuthError } from "../../../lib/errors/authErrors";
import type { AuthErrorDto } from "../../../types";

export const prerender = false;

/**
 * POST /api/auth/reset-password
 * Resets user password using token from email link
 * 
 * @body ResetPasswordCommand { new_password: string, new_password_confirmation: string, token?: string }
 * @returns 200 - Password reset successfully
 * @returns 400 - Invalid input (validation errors)
 * @returns 401 - Invalid or expired token
 * @returns 500 - Server/database errors
 * 
 * Flow:
 * 1. Validate request body with Zod schema
 * 2. Verify token by exchanging it for session (verifyOtp or using session from URL)
 * 3. Update password using Supabase Auth updateUser()
 * 4. Return success
 * 
 * Token handling:
 * - When user clicks email link, Supabase redirects to /auth/reset-password?token={token}
 * - The token can be:
 *   a) An access token (already in session via cookies)
 *   b) A recovery token that needs to be verified
 * 
 * Error handling:
 * - 400: Invalid input (validation errors)
 * - 401: Token invalid, expired, or already used
 * - 500: Server/database errors
 * 
 * Security:
 * - Token is single-use and time-limited
 * - Password requirements enforced by Zod schema
 * - Old password is automatically invalidated
 */
export const POST: APIRoute = async ({ request, locals, cookies }) => {
  const supabase = locals.supabase;

  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      const error: AuthErrorDto = {
        code: "INVALID_JSON",
        message: "Nieprawidłowy format danych",
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate input with Zod schema
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      const error: AuthErrorDto = {
        code: "INVALID_INPUT",
        message: firstError.message,
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { new_password, token } = validationResult.data;

    // Check if user has an active session (token already verified by Supabase)
    // This happens when user clicks the email link and Supabase sets the session automatically
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    // If no active session and token is provided, verify the token
    if (!currentUser && token) {
      // Try to verify the token as a recovery token
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "recovery",
      });

      if (verifyError || !verifyData.session) {
        const error: AuthErrorDto = {
          code: "RESET_TOKEN_INVALID_OR_EXPIRED",
          message: "Link do resetowania hasła wygasł lub jest nieprawidłowy",
        };
        return new Response(JSON.stringify(error), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Token verified - session is now active
      // Cookies are set automatically via Supabase client's setAll
    } else if (!currentUser && !token) {
      // No session and no token - cannot proceed
      const error: AuthErrorDto = {
        code: "RESET_TOKEN_MISSING",
        message: "Brak tokenu resetowania hasła",
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Update password using Supabase Auth
    // At this point, user is authenticated (either from existing session or verified token)
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    });

    if (updateError) {
      // Check for specific error types
      if (updateError.message.includes("same") || updateError.message.includes("identical")) {
        const error: AuthErrorDto = {
          code: "PASSWORD_SAME_AS_OLD",
          message: "Nowe hasło musi być inne niż poprzednie",
        };
        return new Response(JSON.stringify(error), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Generic error
      const authError = mapSupabaseAuthError(updateError);
      return new Response(JSON.stringify(authError), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Success - password updated
    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    // Log error for debugging (don't expose to user)
    console.error("Unexpected error in POST /api/auth/reset-password:", error);

    // Map to user-friendly error
    const authError = mapSupabaseAuthError(error);

    return new Response(JSON.stringify(authError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

