import type { APIRoute } from "astro";
import { forgotPasswordSchema } from "../../../lib/validation/authSchemas";
import { mapSupabaseAuthError } from "../../../lib/errors/authErrors";
import type { AuthErrorDto } from "../../../types";

export const prerender = false;

/**
 * POST /api/auth/forgot-password
 * Sends password reset email to the provided email address
 * 
 * @body ForgotPasswordCommand { email: string }
 * @returns 200 - Email sent successfully (or email doesn't exist - security)
 * @returns 400 - Invalid input (validation errors)
 * @returns 500 - Server/database errors
 * 
 * Flow:
 * 1. Validate request body with Zod schema
 * 2. Call Supabase Auth resetPasswordForEmail()
 * 3. Return success regardless of whether email exists (security best practice)
 * 
 * Error handling:
 * - 400: Invalid input (validation errors)
 * - 500: Server/database errors
 * 
 * Security:
 * - Never reveal if email exists in the database (minimal disclosure)
 * - Always return success to prevent user enumeration attacks
 * - Supabase handles rate limiting automatically
 * - Email contains secure token with expiration
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
    const validationResult = forgotPasswordSchema.safeParse(body);
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

    const { email } = validationResult.data;

    // Get the application URL for the reset link
    // Supabase will send email with link to: {redirectTo}?token={token}
    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/auth/reset-password`;
    // Request password reset email from Supabase Auth
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    // SECURITY: Always return success, even if email doesn't exist
    // This prevents user enumeration attacks
    // Only throw error if there's a server/database issue
    if (resetError) {
      // Check if it's a rate limiting error
      if (resetError.message.includes("rate") || resetError.message.includes("too many")) {
        const error: AuthErrorDto = {
          code: "TOO_MANY_REQUESTS",
          message: "Zbyt wiele prób. Spróbuj ponownie za chwilę",
        };
        return new Response(JSON.stringify(error), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Log other errors for debugging but still return success to user
      console.error("Error in forgot-password (returning success to user):", resetError);
    }

    // Always return success (security: don't reveal if email exists)
    return new Response(null, {
      status: 200,
    });
  } catch (error) {
    // Log error for debugging (don't expose to user)
    console.error("Unexpected error in POST /api/auth/forgot-password:", error);

    // Map to user-friendly error
    const authError = mapSupabaseAuthError(error);

    return new Response(JSON.stringify(authError), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

