"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import {
  countActiveAdminProfiles,
  getPermissionCodesForRole,
  roleHasAdminGates,
} from "@/lib/rbac/get-permissions";
import { isAdministratorRoleName } from "@/lib/rbac/administrator";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  getUserById,
  listUsers,
  type UserRow,
} from "@/lib/db/users";
import {
  userCreateSchema,
  userFilterSchema,
  userUpdateSchema,
  type UserFilterInput,
} from "@/validations/user";

export type UserActionState = {
  error?: string;
  success?: string;
  userId?: string;
};

export type UserGridResult = {
  error?: string;
  success?: string;
  userId?: string;
  user?: UserRow;
  users?: UserRow[];
  total?: number;
};

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

async function assertNotLastAdminLoss(input: {
  targetUserId: string;
  nextRoleId?: string;
  nextActive?: boolean;
  nextDeleted?: boolean;
}): Promise<string | null> {
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role_id, is_active, deleted_at")
    .eq("id", input.targetUserId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) return "User not found.";

  const currentCodes = await getPermissionCodesForRole(profile.role_id);
  const currentlyAdmin =
    profile.is_active && roleHasAdminGates(currentCodes);
  if (!currentlyAdmin) return null;

  const nextRoleId = input.nextRoleId ?? profile.role_id;
  const nextActive = input.nextActive ?? profile.is_active;
  const nextDeleted = input.nextDeleted ?? false;

  let nextIsAdmin = nextActive && !nextDeleted;
  if (nextIsAdmin) {
    const nextCodes = await getPermissionCodesForRole(nextRoleId);
    nextIsAdmin = roleHasAdminGates(nextCodes);
  }

  if (currentlyAdmin && !nextIsAdmin) {
    const otherAdmins = await countActiveAdminProfiles(input.targetUserId);
    if (otherAdmins < 1) {
      return "Cannot change or deactivate the last administrator.";
    }
  }

  return null;
}

export async function createUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const ctx = await authorize("user.create");

    const parsed = userCreateSchema.safeParse({
      display_name: formData.get("display_name"),
      email: formData.get("email"),
      password: formData.get("password"),
      role_id: formData.get("role_id"),
      is_active:
        formData.get("is_active") === "on" ||
        formData.get("is_active") === "true",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid user" };
    }

    const supabase = await createClient();
    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("id", parsed.data.role_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (roleError) throw new Error(roleError.message);
    if (!role) return { error: "Selected role was not found." };

    const admin = createAdminClient();
    const { data: authData, error: authError } =
      await admin.auth.admin.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        email_confirm: true,
        user_metadata: {
          display_name: parsed.data.display_name,
        },
      });

    if (authError || !authData.user) {
      const message = authError?.message ?? "Unable to create auth user.";
      if (/already|registered|exists/i.test(message)) {
        return { error: "A user with this email already exists." };
      }
      return { error: message };
    }

    const userId = authData.user.id;

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      display_name: parsed.data.display_name,
      email: parsed.data.email,
      role_id: parsed.data.role_id,
      is_active: parsed.data.is_active,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(userId);
      if (profileError.code === "23505") {
        return { error: "A user with this email already exists." };
      }
      throw new Error(profileError.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "USER_CREATED",
      module: "users",
      entityType: "user",
      entityId: userId,
      metadata: {
        email: parsed.data.email,
        role_id: parsed.data.role_id,
        is_active: parsed.data.is_active,
      },
    });

    revalidatePath("/users");
    revalidatePath("/roles");
    return { success: "User created.", userId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const ctx = await authorize("user.update");

    const userId = String(formData.get("userId") || "");
    if (!userId) return { error: "Missing user id" };

    const parsed = userUpdateSchema.safeParse({
      display_name: formData.get("display_name"),
      email: formData.get("email"),
      role_id: formData.get("role_id"),
      is_active:
        formData.get("is_active") === "on" ||
        formData.get("is_active") === "true",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid user" };
    }

    const guard = await assertNotLastAdminLoss({
      targetUserId: userId,
      nextRoleId: parsed.data.role_id,
      nextActive: parsed.data.is_active,
    });
    if (guard) return { error: guard };

    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);
    if (!existing) return { error: "User not found." };

    const { data: role, error: roleError } = await supabase
      .from("roles")
      .select("id")
      .eq("id", parsed.data.role_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (roleError) throw new Error(roleError.message);
    if (!role) return { error: "Selected role was not found." };

    if (existing.email !== parsed.data.email) {
      const admin = createAdminClient();
      const { error: emailError } = await admin.auth.admin.updateUserById(
        userId,
        { email: parsed.data.email, email_confirm: true },
      );
      if (emailError) {
        if (/already|registered|exists/i.test(emailError.message)) {
          return { error: "A user with this email already exists." };
        }
        return { error: emailError.message };
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: parsed.data.display_name,
        email: parsed.data.email,
        role_id: parsed.data.role_id,
        is_active: parsed.data.is_active,
      })
      .eq("id", userId)
      .is("deleted_at", null);

    if (error) {
      if (error.code === "23505") {
        return { error: "A user with this email already exists." };
      }
      throw new Error(error.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "USER_UPDATED",
      module: "users",
      entityType: "user",
      entityId: userId,
      metadata: {
        display_name: parsed.data.display_name,
        email: parsed.data.email,
        role_id: parsed.data.role_id,
        is_active: parsed.data.is_active,
      },
    });

    revalidatePath("/users");
    revalidatePath("/roles");
    revalidatePath("/profile");
    return { success: "User updated.", userId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setUserActiveAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const ctx = await authorize("user.update");

    const userId = String(formData.get("userId") || "");
    const nextActive = formData.get("is_active") === "true";

    if (!userId) return { error: "Missing user id" };

    if (!nextActive && userId === ctx.userId) {
      return { error: "You cannot deactivate your own account." };
    }

    if (!nextActive) {
      const guard = await assertNotLastAdminLoss({
        targetUserId: userId,
        nextActive: false,
      });
      if (guard) return { error: guard };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({ is_active: nextActive })
      .eq("id", userId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "USER_UPDATED",
      module: "users",
      entityType: "user",
      entityId: userId,
      metadata: { is_active: nextActive, via: "toggle_active" },
    });

    revalidatePath("/users");
    revalidatePath("/roles");
    return {
      success: nextActive ? "User activated." : "User deactivated.",
      userId,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteUserAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const ctx = await authorize("user.delete");

    const userId = String(formData.get("userId") || "");
    if (!userId) return { error: "Missing user id" };

    if (userId === ctx.userId) {
      return { error: "You cannot delete your own account." };
    }

    const target = await getUserById(userId);
    if (!target) return { error: "User not found." };
    if (isAdministratorRoleName(target.role?.name)) {
      return { error: "Administrator accounts cannot be deleted." };
    }

    const guard = await assertNotLastAdminLoss({
      targetUserId: userId,
      nextActive: false,
      nextDeleted: true,
    });
    if (guard) return { error: guard };

    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", userId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "USER_DELETED",
      module: "users",
      entityType: "user",
      entityId: userId,
    });

    revalidatePath("/users");
    revalidatePath("/roles");
    return { success: "User deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function loadUsersGridAction(
  rawFilters: Partial<UserFilterInput> = {},
): Promise<UserGridResult> {
  try {
    await authorize("user.view");
    const filters = userFilterSchema.parse(rawFilters);
    const result = await listUsers(filters);
    return { users: result.users, total: result.total };
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchUserFieldAction(input: {
  userId: string;
  field: "display_name" | "role_id" | "is_active";
  value: string;
}): Promise<UserGridResult> {
  try {
    const ctx = await authorize("user.update");

    if (!input.userId) return { error: "Missing user id" };

    const existing = await getUserById(input.userId);
    if (!existing) return { error: "User not found." };

    if (isAdministratorRoleName(existing.role?.name)) {
      return { error: "Administrator accounts cannot be edited." };
    }

    const supabase = await createClient();
    const patch: {
      display_name?: string;
      role_id?: string;
      is_active?: boolean;
    } = {};

    if (input.field === "display_name") {
      const display_name = input.value.trim();
      if (display_name.length < 2) {
        return { error: "Display name must be at least 2 characters" };
      }
      if (display_name.length > 120) {
        return { error: "Display name is too long" };
      }
      patch.display_name = display_name;
    } else if (input.field === "role_id") {
      const role_id = input.value.trim();
      const parsed = userUpdateSchema.shape.role_id.safeParse(role_id);
      if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Select a role" };
      }
      const { data: role, error: roleError } = await supabase
        .from("roles")
        .select("id")
        .eq("id", role_id)
        .is("deleted_at", null)
        .maybeSingle();

      if (roleError) throw new Error(roleError.message);
      if (!role) return { error: "Selected role was not found." };

      const guard = await assertNotLastAdminLoss({
        targetUserId: input.userId,
        nextRoleId: role_id,
      });
      if (guard) return { error: guard };

      patch.role_id = role_id;
    } else if (input.field === "is_active") {
      const nextActive = input.value === "true";

      if (!nextActive && input.userId === ctx.userId) {
        return { error: "You cannot deactivate your own account." };
      }

      if (!nextActive) {
        const guard = await assertNotLastAdminLoss({
          targetUserId: input.userId,
          nextActive: false,
        });
        if (guard) return { error: guard };
      }

      patch.is_active = nextActive;
    }

    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", input.userId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "USER_UPDATED",
      module: "users",
      entityType: "user",
      entityId: input.userId,
      metadata: { field: input.field, via: "grid" },
    });

    revalidatePath("/users");
    revalidatePath("/roles");
    if (input.field === "display_name" || input.field === "role_id") {
      revalidatePath("/profile");
    }

    const user = await getUserById(input.userId);
    return {
      success: "Saved",
      userId: input.userId,
      user: user ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function resetUserPasswordAction(
  _prev: UserActionState,
  formData: FormData,
): Promise<UserActionState> {
  try {
    const ctx = await authorize("user.reset_password");

    const userId = String(formData.get("userId") || "");
    if (!userId) return { error: "Missing user id" };

    const supabase = await createClient();
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, is_active, deleted_at")
      .eq("id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (profileError) throw new Error(profileError.message);
    if (!profile) return { error: "User not found." };
    if (!profile.is_active) {
      return { error: "Cannot reset password for an inactive user." };
    }

    const admin = createAdminClient();
    const { error } = await admin.auth.resetPasswordForEmail(profile.email, {
      redirectTo: `${appUrl()}/auth/callback?next=/update-password`,
    });

    if (error) return { error: error.message };

    await logActivity({
      actorId: ctx.userId,
      action: "USER_PASSWORD_RESET",
      module: "users",
      entityType: "user",
      entityId: userId,
      metadata: { email: profile.email },
    });

    revalidatePath("/users");
    return {
      success: "Password reset email sent.",
      userId,
    };
  } catch (error) {
    return toActionError(error);
  }
}
