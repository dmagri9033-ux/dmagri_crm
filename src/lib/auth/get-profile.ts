import { cache } from "react";
import { getAuthUser } from "@/lib/auth/session";
import type { ProfileWithRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type RolePermRow = {
  permissions: { code: string } | { code: string }[] | null;
};

type RoleWithPerms = {
  id: string;
  name: string;
  is_system: boolean;
  role_permissions?: RolePermRow[] | null;
};

function permissionCodesFromRole(role: RoleWithPerms | null): string[] {
  if (!role?.role_permissions?.length) return [];
  const codes: string[] = [];
  for (const row of role.role_permissions) {
    const permission = Array.isArray(row.permissions)
      ? row.permissions[0]
      : row.permissions;
    if (permission && typeof permission.code === "string") {
      codes.push(permission.code);
    }
  }
  return codes;
}

export const getProfileByUserId = cache(
  async (userId: string): Promise<ProfileWithRole | null> => {
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
        is_system,
        role_permissions (
          permissions ( code )
        )
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

    const rolesRaw = Array.isArray(data.roles)
      ? data.roles[0] ?? null
      : data.roles;
    const rolesWithPerms = rolesRaw as RoleWithPerms | null;
    const permissionCodes = permissionCodesFromRole(rolesWithPerms);

    const roles = rolesWithPerms
      ? {
          id: rolesWithPerms.id,
          name: rolesWithPerms.name,
          is_system: rolesWithPerms.is_system,
        }
      : null;

    return {
      ...data,
      roles,
      permissionCodes,
    } as ProfileWithRole;
  },
);

/** Deduped per RSC request. */
export const getCurrentProfile = cache(
  async (): Promise<ProfileWithRole | null> => {
    const user = await getAuthUser();
    if (!user) return null;
    return getProfileByUserId(user.id);
  },
);

/**
 * Active CRM profile required for app access.
 * Returns null when unauthenticated, missing profile, or inactive.
 */
export async function getActiveProfile(): Promise<ProfileWithRole | null> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return null;
  return profile;
}
