import { createClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
export type SupabaseClient = typeof supabaseClient;

/**
 * Cookie options for Supabase auth tokens
 * - httpOnly: prevents client-side JS access (XSS protection)
 * - secure: only sent over HTTPS in production
 * - sameSite: 'lax' allows cookies on same-site navigation
 * - path: '/' makes cookie available across entire app
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parses browser Cookie header into array of name/value pairs
 * Required for Supabase SSR cookie handling
 * 
 * @param cookieHeader - Raw Cookie header string from request
 * @returns Array of cookie objects with name and value
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Creates a Supabase server client with SSR cookie support
 * Used in middleware and API endpoints for server-side auth
 * 
 * IMPORTANT: Use ONLY getAll/setAll for cookie management
 * DO NOT use individual get/set/remove methods
 * 
 * @param context - Object with headers and cookies from Astro context
 * @returns Configured Supabase server client with auth session
 */
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
}) => {
  const supabase = createServerClient<Database>(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            context.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  return supabase;
};
