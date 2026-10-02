import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import {
  userFilterSchema,
  type UserFilterInput,
} from "@/validations/user";

export type UserRoleLite = Pick<Tables<"roles">, "id" | "name" | "is_system">;

export type UserRow = Tables<"profiles"> & {
  role: UserRoleLite | null;
};

export type UserListResult = {
  users: UserRow[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listUsers(
  rawFilters: Partial<UserFilterInput> = {},
): Promise<UserListResult> {
  const filters = userFilterSchema.parse(rawFilters);
  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("*, role:roles ( id, name, is_system )", { count: "exact" })
    .is("deleted_at", null);

  if (filters.search) {
    query = query.or(
      `display_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`,
    );
  }

  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  if (filters.role_id) {
    query = query.eq("role_id", filters.role_id);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await query
    .order("display_name", { ascending: true })
    .range(from, to);

  if (error) throw new Error(error.message);

  const users: UserRow[] = (data ?? []).map((row) => {
    const role = Array.isArray(row.role) ? row.role[0] ?? null : row.role;
    return {
      id: row.id,
      display_name: row.display_name,
      email: row.email,
      role_id: row.role_id,
      is_active: row.is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
      role: role
        ? {
            id: role.id,
            name: role.name,
            is_system: role.is_system,
          }
        : null,
    };
  });

  return {
    users,
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, role:roles ( id, name, is_system )")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  const role = Array.isArray(data.role) ? data.role[0] ?? null : data.role;
  return {
    id: data.id,
    display_name: data.display_name,
    email: data.email,
    role_id: data.role_id,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
    deleted_at: data.deleted_at,
    role: role
      ? { id: role.id, name: role.name, is_system: role.is_system }
      : null,
  };
}

/** Active (non-deleted) roles for user create/edit pickers. */
export async function listRolesForUserPicker(): Promise<UserRoleLite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, is_system")
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
