import type { APIRoute } from "astro";
import { registerSchema } from "../../../lib/validation/authSchemas";
import { mapSupabaseAuthError } from "../../../lib/errors/authErrors";
import type { AuthResponseDto, AuthErrorDto } from "../../../types";

export const prerender = false;

/**
 * POST /api/auth/register
 * Register a new user with email and password
 *
 * @body RegisterCommand { email: string, password: string, password_confirmation: string }
 * @returns AuthResponseDto on success (200) with user data
 * @returns AuthErrorDto on error (400/409/500)
 *
 * Flow:
 * 1. Validate request body with Zod schema
 * 2. Attempt sign up with Supabase Auth
 * 3. Supabase sends confirmation email to user
 * 4. Return user data (without tokens - email not confirmed yet)
 *
 * Error handling:
 * - 400: Invalid input (validation errors)
 * - 409: Email already registered
 * - 500: Server/database errors
 *
 * Security:
 * - Passwords are never logged or exposed
 * - Error messages follow minimal disclosure principle
 * - User must confirm email before being able to log in
 *
 * Note: After successful registration, user receives email with confirmation link.
 * Until email is confirmed, user cannot log in (EMAIL_NOT_CONFIRMED error).
 */
export const POST: APIRoute = async ({ request, locals }) => {
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
    const validationResult = registerSchema.safeParse(body);
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

    const { email, password } = validationResult.data;

    // Attempt to sign up with Supabase Auth
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/login`,
      },
    });

    // Handle registration errors
    if (signUpError) {
      const authError = mapSupabaseAuthError(signUpError);

      // Return 409 for already registered email, 400 for other errors
      const statusCode = authError.code === "EMAIL_ALREADY_REGISTERED" ? 409 : 400;

      return new Response(JSON.stringify(authError), {
        status: statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    // User object should exist even if email is not confirmed yet
    if (!data.user) {
      const error: AuthErrorDto = {
        code: "REGISTRATION_FAILED",
        message: "Nie udało się utworzyć konta. Spróbuj ponownie",
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { user } = data;

    // IMPORTANT: Sign out immediately after registration
    // This prevents auto-login when email confirmation is disabled in dev
    // User must confirm email before being able to log in
    await supabase.auth.signOut();

    // Prepare response with user data
    // No tokens returned - user must confirm email first before logging in
    const response: AuthResponseDto = {
      user: {
        id: user.id,
        email: user.email ?? "",
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Map to user-friendly error
    const authError = mapSupabaseAuthError(error);

    return new Response(JSON.stringify(authError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
