import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

/**
 * Public paths that don't require authentication
 * These paths are accessible to unauthenticated users
 * 
 * Note: /api/auth/logout is NOT public - requires active session
 */
const PUBLIC_PATHS = [
  // Auth pages
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  
  // Auth API endpoints (public only)
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

/**
 * Astro middleware for authentication and request context
 * 
 * Responsibilities:
 * 1. Create per-request Supabase server client with SSR cookie support
 * 2. Extract user session from cookies
 * 3. Populate context.locals with supabase client and user data
 * 4. Protect non-public routes (redirect to /auth/login if not authenticated)
 * 
 * Authentication is now enforced - all protected routes require valid user session
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { cookies, url, request, redirect, locals } = context;
  
  // Create Supabase server client with SSR cookie support
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });
  
  // Store supabase client in locals for use in routes and API endpoints
  locals.supabase = supabase;
  
  // Get authenticated user session
  // IMPORTANT: Always call getUser() before any other operations
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  // Store user data in locals if authenticated
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email ?? "",
    };
  }
  
  // Check if current path requires authentication
  const isPublicPath = PUBLIC_PATHS.includes(url.pathname);
  
  if (!user && !isPublicPath) {
    // Redirect unauthenticated users to login page
    return redirect("/auth/login");
  }
  
  if (user && (url.pathname === "/auth/login" || url.pathname === "/auth/register")) {
    // Redirect authenticated users away from auth pages
    return redirect("/");
  }
  
  
  return next();
});
