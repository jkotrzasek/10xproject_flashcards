import type { APIRoute } from "astro";
import { loginSchema } from "../../../lib/validation/authSchemas";
import { mapSupabaseAuthError } from "../../../lib/errors/authErrors";
import type { AuthResponseDto, AuthErrorDto } from "../../../types";

export const prerender = false;

/**
 * POST /api/auth/login
 * Authenticate user with email and password
 * 
 * @body LoginCommand { email: string, password: string }
 * @returns AuthResponseDto on success (200) with user data and tokens
 * @returns AuthErrorDto on error (400/401/500)
 * 
 * Flow:
 * 1. Validate request body with Zod schema
 * 2. Attempt sign in with Supabase Auth
 * 3. Set secure HTTP-only cookies for session management
 * 4. Return user data and tokens (tokens also in cookies for SSR)
 * 
 * Error handling:
 * - 400: Invalid input (validation errors)
 * - 401: Invalid credentials or email not confirmed
 * - 500: Server/database errors
 * 
 * Security:
 * - Passwords are never logged or exposed
 * - Error messages follow minimal disclosure principle
 * - Session tokens stored in secure HTTP-only cookies
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
    const validationResult = loginSchema.safeParse(body);
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

    // Attempt to sign in with Supabase Auth
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Handle authentication errors
    if (signInError || !data.session || !data.user) {
      const authError = mapSupabaseAuthError(signInError);
      return new Response(JSON.stringify(authError), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Session and user are valid at this point
    const { session, user } = data;

    // Set secure HTTP-only cookies for session management
    // These cookies enable SSR authentication in middleware
    cookies.set("sb-access-token", session.access_token, {
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    cookies.set("sb-refresh-token", session.refresh_token, {
      path: "/",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Prepare response with user data and tokens
    // Tokens are also in cookies, but we return them for client-side use if needed
    const response: AuthResponseDto = {
      user: {
        id: user.id,
        email: user.email ?? "",
      },
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log error for debugging (don't expose to user)
    console.error("Unexpected error in POST /api/auth/login:", error);

    // Map to user-friendly error
    const authError = mapSupabaseAuthError(error);

    return new Response(JSON.stringify(authError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

