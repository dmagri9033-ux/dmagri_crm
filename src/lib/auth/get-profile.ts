import { createClient } from "@/lib/supabase/server";
import type { ProfileWithRole } from "@/lib/auth/session";

export async function getProfileByUserId(
  userId: string,
): Promise<ProfileWithRole | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      display_name,
      email,
      role_id,
      is_active,
      created_at,
      updated_at,
      deleted_at,
      roles (
        id,
        name,
        is_system
      )
    `,
    )
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  const roles = Array.isArray(data.roles) ? data.roles[0] ?? null : data.roles;

  return {
    ...data,
    roles,
  } as ProfileWithRole;
}

export async function getCurrentProfile(): Promise<ProfileWithRole | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return getProfileByUserId(user.id);
}

/**
 * Active CRM profile required for app access.
 * Returns null when unauthenticated, missing profile, or inactive.
 */
export async function getActiveProfile(): Promise<ProfileWithRole | null> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return null;
  return profile;
}
