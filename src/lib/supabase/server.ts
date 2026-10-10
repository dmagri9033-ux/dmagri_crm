import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * Server Supabase client bound to the user session cookies.
 * Use in Server Components, Server Actions, and Route Handlers.
 * RLS applies as the authenticated user.
 */
export async function createClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  const cookieStore = await cookies();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only.
          // Middleware refresh handles session updates.
        }
      },
    },
    // Avoid Next.js fetch caching of PostgREST GETs on Vercel (stale/slow cold paths).
    global: {
      fetch(input, init) {
        return fetch(input, { ...init, cache: "no-store" });
      },
    },
  });
}
