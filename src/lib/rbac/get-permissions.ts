import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  ADMIN_GATE_PERMISSIONS,
  isPermissionCode,
  type PermissionCode,
} from "@/lib/rbac/permissions";

export const getPermissionCodesForRole = cache(
  async (roleId: string): Promise<Set<PermissionCode>> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("role_permissions")
      .select("permissions ( code )")
      .eq("role_id", roleId);

    if (error) {
      throw new Error(error.message);
    }

    const codes = new Set<PermissionCode>();
    for (const row of data ?? []) {
      const permission = Array.isArray(row.permissions)
        ? row.permissions[0]
        : row.permissions;
      const code = permission && "code" in permission ? permission.code : null;
      if (typeof code === "string" && isPermissionCode(code)) {
        codes.add(code);
      }
    }
    return codes;
  },
);

export const getPermissionCodesForUser = cache(
  async (userId: string): Promise<Set<PermissionCode>> => {
    const supabase = await createClient();
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role_id, is_active, deleted_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!profile || !profile.is_active || profile.deleted_at) {
      return new Set();
    }

    return getPermissionCodesForRole(profile.role_id);
  },
);

export async function listPermissionsCatalog() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("permissions")
    .select("id, code, module, description")
    .order("module")
    .order("code");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Active profiles whose role still has administrator gate permissions. */
export async function countActiveAdminProfiles(
  excludeUserId?: string,
): Promise<number> {
  const supabase = await createClient();

  const { data: rolesWithGates, error: roleError } = await supabase
    .from("role_permissions")
    .select("role_id, permissions ( code )");

  if (roleError) throw new Error(roleError.message);

  const adminRoleIds = new Set<string>();
  const rolePermMap = new Map<string, Set<string>>();

  for (const row of rolesWithGates ?? []) {
    const permission = Array.isArray(row.permissions)
      ? row.permissions[0]
      : row.permissions;
    const code = permission && "code" in permission ? String(permission.code) : null;
    if (!code) continue;
    const set = rolePermMap.get(row.role_id) ?? new Set<string>();
    set.add(code);
    rolePermMap.set(row.role_id, set);
  }

  for (const [roleId, codes] of rolePermMap) {
    if (ADMIN_GATE_PERMISSIONS.every((p) => codes.has(p))) {
      adminRoleIds.add(roleId);
    }
  }

  if (adminRoleIds.size === 0) return 0;

  let query = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("role_id", [...adminRoleIds])
    .eq("is_active", true)
    .is("deleted_at", null);

  if (excludeUserId) {
    query = query.neq("id", excludeUserId);
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function roleHasAdminGates(codes: Iterable<string>): boolean {
  const set = codes instanceof Set ? codes : new Set(codes);
  return ADMIN_GATE_PERMISSIONS.every((p) => set.has(p));
}
