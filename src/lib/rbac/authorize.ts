import { getCurrentProfile } from "@/lib/auth/get-profile";
import type { ProfileWithRole } from "@/lib/auth/session";
import { getAuthUser } from "@/lib/auth/session";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { getPermissionCodesForRole } from "@/lib/rbac/get-permissions";
import type { PermissionCode } from "@/lib/rbac/permissions";

export type SessionContext = {
  userId: string;
  profile: ProfileWithRole;
  permissions: Set<PermissionCode>;
};

export async function getSessionContext(): Promise<SessionContext> {
  const user = await getAuthUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active || profile.deleted_at) {
    throw new UnauthorizedError("INACTIVE_OR_MISSING_PROFILE");
  }

  const permissions = await getPermissionCodesForRole(profile.role_id);

  return {
    userId: user.id,
    profile,
    permissions,
  };
}

export async function authorize(
  required: PermissionCode | PermissionCode[],
): Promise<SessionContext> {
  const ctx = await getSessionContext();
  const needed = Array.isArray(required) ? required : [required];

  if (!needed.every((code) => ctx.permissions.has(code))) {
    throw new ForbiddenError();
  }

  return ctx;
}

export async function authorizeAny(
  codes: PermissionCode[],
): Promise<SessionContext> {
  const ctx = await getSessionContext();
  if (!codes.some((code) => ctx.permissions.has(code))) {
    throw new ForbiddenError();
  }
  return ctx;
}

export function hasPermission(
  permissions: Set<PermissionCode> | PermissionCode[],
  code: PermissionCode,
): boolean {
  if (permissions instanceof Set) return permissions.has(code);
  return permissions.includes(code);
}
