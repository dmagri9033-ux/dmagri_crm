import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * Browser Supabase client (anon / publishable key only).
 * Never import admin client code into Client Components.
 */
export function createClient() {
  const { url, anonKey } = getSupabasePublicConfig();
  return createBrowserClient<Database>(url, anonKey);
}
