"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import {
  countActiveAdminProfiles,
  roleHasAdminGates,
} from "@/lib/rbac/get-permissions";
import { isPermissionCode } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";
import { roleFormSchema } from "@/validations/role";

export type RoleActionState = {
  error?: string;
  success?: string;
  roleId?: string;
};

function parsePermissionCodes(formData: FormData): string[] {
  return formData
    .getAll("permissionCodes")
    .map(String)
    .filter((code) => isPermissionCode(code));
}

async function syncRolePermissions(roleId: string, codes: string[]) {
  const supabase = await createClient();

  const { data: permissions, error: permError } = await supabase
    .from("permissions")
    .select("id, code")
    .in("code", codes);

  if (permError) throw new Error(permError.message);

  const permissionIds = (permissions ?? []).map((p) => p.id);
  if (permissionIds.length === 0) {
    throw new Error("No valid permissions selected");
  }

  const { error: deleteError } = await supabase
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);

  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from("role_permissions").insert(
    permissionIds.map((permission_id) => ({
      role_id: roleId,
      permission_id,
    })),
  );

  if (insertError) throw new Error(insertError.message);
}

export async function createRoleAction(
  _prev: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  try {
    const ctx = await authorize("role.create");

    const parsed = roleFormSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") || "",
      permissionCodes: parsePermissionCodes(formData),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid role" };
    }

    const supabase = await createClient();
    const { data: role, error } = await supabase
      .from("roles")
      .insert({
        name: parsed.data.name,
        description: parsed.data.description || null,
        is_system: false,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "A role with this name already exists." };
      }
      throw new Error(error.message);
    }

    await syncRolePermissions(role.id, parsed.data.permissionCodes);

    await logActivity({
      actorId: ctx.userId,
      action: "ROLE_CREATED",
      module: "roles",
      entityType: "role",
      entityId: role.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/roles");
    return { success: "Role created.", roleId: role.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateRoleAction(
  _prev: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  try {
    const ctx = await authorize("role.update");
    const roleId = String(formData.get("roleId") || "");
    if (!roleId) return { error: "Missing role id" };

    const parsed = roleFormSchema.safeParse({
      name: formData.get("name"),
      description: formData.get("description") || "",
      permissionCodes: parsePermissionCodes(formData),
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid role" };
    }

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("roles")
      .select("*")
      .eq("id", roleId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) return { error: "Role not found." };

    if (existing.is_system && parsed.data.name !== existing.name) {
      return { error: "System role names cannot be changed." };
    }

    const nextCodes = parsed.data.permissionCodes;
    const nextIsAdmin = roleHasAdminGates(nextCodes);

    const { data: currentPermRows, error: currentPermError } = await supabase
      .from("role_permissions")
      .select("permissions ( code )")
      .eq("role_id", roleId);

    if (currentPermError) throw new Error(currentPermError.message);

    const currentCodes = new Set<string>();
    for (const row of currentPermRows ?? []) {
      const permission = Array.isArray(row.permissions)
        ? row.permissions[0]
        : row.permissions;
      if (permission && "code" in permission) {
        currentCodes.add(String(permission.code));
      }
    }

    const currentlyAdmin = roleHasAdminGates(currentCodes);

    // Prevent removing admin gates from a role if that would leave zero admins.
    if (currentlyAdmin && !nextIsAdmin) {
      const admins = await countActiveAdminProfiles();
      const { count: usersOnRole, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role_id", roleId)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (countError) throw new Error(countError.message);

      if ((usersOnRole ?? 0) > 0 && admins - (usersOnRole ?? 0) < 1) {
        return {
          error:
            "Cannot remove administrator permissions from the last administrator role.",
        };
      }
    }

    // Self-demotion: current user on this role losing admin gates with no other admin.
    if (
      ctx.profile.role_id === roleId &&
      currentlyAdmin &&
      !nextIsAdmin
    ) {
      const otherAdmins = await countActiveAdminProfiles(ctx.userId);
      if (otherAdmins < 1) {
        return {
          error:
            "You cannot remove your own administrator permissions when you are the last administrator.",
        };
      }
    }

    const { error: updateError } = await supabase
      .from("roles")
      .update({
        name: parsed.data.name,
        description: parsed.data.description || null,
      })
      .eq("id", roleId);

    if (updateError) {
      if (updateError.code === "23505") {
        return { error: "A role with this name already exists." };
      }
      throw new Error(updateError.message);
    }

    await syncRolePermissions(roleId, nextCodes);

    await logActivity({
      actorId: ctx.userId,
      action: "ROLE_UPDATED",
      module: "roles",
      entityType: "role",
      entityId: roleId,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/roles");
    revalidatePath(`/roles/${roleId}`);
    return { success: "Role updated.", roleId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteRoleAction(
  _prev: RoleActionState,
  formData: FormData,
): Promise<RoleActionState> {
  try {
    const ctx = await authorize("role.delete");
    const roleId = String(formData.get("roleId") || "");
    if (!roleId) return { error: "Missing role id" };

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("roles")
      .select("*")
      .eq("id", roleId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) return { error: "Role not found." };

    if (existing.is_system) {
      return { error: "System roles cannot be deleted." };
    }

    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role_id", roleId)
      .is("deleted_at", null);

    if (countError) throw new Error(countError.message);
    if ((count ?? 0) > 0) {
      return {
        error: `This role is assigned to ${count} user(s). Reassign them before deleting.`,
      };
    }

    const { error: deleteError } = await supabase
      .from("roles")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", roleId);

    if (deleteError) throw new Error(deleteError.message);

    await logActivity({
      actorId: ctx.userId,
      action: "ROLE_DELETED",
      module: "roles",
      entityType: "role",
      entityId: roleId,
      metadata: { name: existing.name },
    });

    revalidatePath("/roles");
    return { success: "Role deleted." };
  } catch (error) {
    return toActionError(error);
  }
}
