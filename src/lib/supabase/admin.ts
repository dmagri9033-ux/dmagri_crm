import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { getSupabaseAdminConfig } from "@/lib/supabase/config";

/**
 * Privileged Supabase client (service role / secret key).
 * SERVER ONLY — never import from Client Components or expose to the browser.
 * Use only for: auth admin (create/disable users), cron, and rare bypasses.
 */
export function createAdminClient() {
  const { url, serviceRoleKey } = getSupabaseAdminConfig();

  return createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
