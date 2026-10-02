import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdministratorRoleName } from "@/lib/rbac/administrator-shared";

export { isAdministratorRoleName } from "@/lib/rbac/administrator-shared";

/** True when the signed-in user's role is Administrator. */
export const currentUserIsAdministrator = cache(async (): Promise<boolean> => {
  const profile = await getCurrentProfile();
  return isAdministratorRoleName(profile?.roles?.name);
});

/**
 * Cross-request cache (no cookies) — admin roster rarely changes.
 * Avoids 2 extra Supabase round-trips on every list query on Vercel.
 */
const getCachedAdministratorProfileIds = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = createAdminClient();

    const { data: roles, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .ilike("name", "Administrator")
      .is("deleted_at", null);

    if (roleError) throw new Error(roleError.message);
    if (!roles?.length) return [];

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .in(
        "role_id",
        roles.map((r) => r.id),
      )
      .is("deleted_at", null);

    if (profileError) throw new Error(profileError.message);
    return (profiles ?? []).map((p) => p.id);
  },
  ["administrator-profile-ids-v1"],
  { revalidate: 300, tags: ["administrator-profile-ids"] },
);

/** Profile ids whose current role is Administrator. Cached per request + 5 min. */
export const listAdministratorProfileIds = cache(async (): Promise<string[]> => {
  return getCachedAdministratorProfileIds();
});

/**
 * PostgREST `.or(...)` filter that hides Administrator-created rows from
 * non-administrators. Returns null when no filter is needed (viewer is admin
 * or there are no administrator profiles).
 *
 * Keep null creators visible: `created_by.is.null,created_by.not.in.(...)`.
 */
export async function administratorCreatorOrFilter(
  column: "created_by" | "actor_id" = "created_by",
): Promise<string | null> {
  if (await currentUserIsAdministrator()) return null;

  const ids = await listAdministratorProfileIds();
  if (ids.length === 0) return null;

  return `${column}.is.null,${column}.not.in.(${ids.join(",")})`;
}
