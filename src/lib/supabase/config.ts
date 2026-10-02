import { getPublicEnv, getServerEnv } from "@/lib/env";

/**
 * Normalize project URL.
 * Users sometimes paste `...supabase.co/rest/v1/` from the API docs — strip that.
 */
export function normalizeSupabaseUrl(raw: string): string {
  return raw.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/i, "");
}

export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  const env = getPublicEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local.",
    );
  }

  return {
    url: normalizeSupabaseUrl(url),
    anonKey,
  };
}

export function getSupabaseAdminConfig(): {
  url: string;
  serviceRoleKey: string;
} {
  const { url } = getSupabasePublicConfig();
  const { SUPABASE_SERVICE_ROLE_KEY } = getServerEnv();

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. This key is server-only and must never be exposed to the browser.",
    );
  }

  return {
    url,
    serviceRoleKey: SUPABASE_SERVICE_ROLE_KEY,
  };
}
