import { cache } from "react";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import type { ProfileWithRole } from "@/lib/auth/session";
import { getAuthUser } from "@/lib/auth/session";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { getPermissionCodesForRole } from "@/lib/rbac/get-permissions";
import {
  isPermissionCode,
  type PermissionCode,
} from "@/lib/rbac/permissions";

export type SessionContext = {
  userId: string;
  profile: ProfileWithRole;
  permissions: Set<PermissionCode>;
};

function permissionsFromProfile(profile: ProfileWithRole): Set<PermissionCode> {
  const codes = new Set<PermissionCode>();
  for (const code of profile.permissionCodes ?? []) {
    if (isPermissionCode(code)) codes.add(code);
  }
  return codes;
}

/** Deduped per RSC request — shared by layout and page guards. */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const user = await getAuthUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.deleted_at) {
    throw new UnauthorizedError("MISSING_PROFILE");
  }
  if (!profile.is_active) {
    throw new UnauthorizedError("INACTIVE_PROFILE");
  }

  let permissions = permissionsFromProfile(profile);
  // Fallback if nested join was empty (older schema / RLS edge cases).
  if (permissions.size === 0) {
    permissions = await getPermissionCodesForRole(profile.role_id);
  }

  return {
    userId: user.id,
    profile,
    permissions,
  };
});

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
