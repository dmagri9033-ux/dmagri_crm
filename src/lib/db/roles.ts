import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type RoleRow = Tables<"roles"> & {
  permission_count: number;
  user_count: number;
};

export async function listRoles(): Promise<RoleRow[]> {
  const supabase = await createClient();

  const { data: roles, error } = await supabase
    .from("roles")
    .select("*")
    .is("deleted_at", null)
    .order("name");

  if (error) throw new Error(error.message);

  const roleIds = (roles ?? []).map((r) => r.id);
  if (roleIds.length === 0) return [];

  const [{ data: rolePerms }, { data: profiles }] = await Promise.all([
    supabase.from("role_permissions").select("role_id").in("role_id", roleIds),
    supabase
      .from("profiles")
      .select("role_id")
      .in("role_id", roleIds)
      .is("deleted_at", null),
  ]);

  const permCounts = new Map<string, number>();
  for (const row of rolePerms ?? []) {
    permCounts.set(row.role_id, (permCounts.get(row.role_id) ?? 0) + 1);
  }

  const userCounts = new Map<string, number>();
  for (const row of profiles ?? []) {
    userCounts.set(row.role_id, (userCounts.get(row.role_id) ?? 0) + 1);
  }

  return (roles ?? []).map((role) => ({
    ...role,
    permission_count: permCounts.get(role.id) ?? 0,
    user_count: userCounts.get(role.id) ?? 0,
  }));
}

export async function getRoleWithPermissions(roleId: string) {
  const supabase = await createClient();

  const { data: role, error } = await supabase
    .from("roles")
    .select("*")
    .eq("id", roleId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!role) return null;

  const { data: rolePerms, error: rpError } = await supabase
    .from("role_permissions")
    .select("permissions ( code )")
    .eq("role_id", roleId);

  if (rpError) throw new Error(rpError.message);

  const permissionCodes: string[] = [];
  for (const row of rolePerms ?? []) {
    const permission = Array.isArray(row.permissions)
      ? row.permissions[0]
      : row.permissions;
    if (permission && "code" in permission && typeof permission.code === "string") {
      permissionCodes.push(permission.code);
    }
  }

  return { role, permissionCodes };
}
