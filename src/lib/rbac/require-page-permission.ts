import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import type { PermissionCode } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";

/**
 * Server helper: authorize a page permission.
 * Returns null when forbidden (caller should render Forbidden UI).
 */
export async function requirePagePermission(permission: PermissionCode) {
  try {
    return await authorize(permission);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }
    if (error instanceof ForbiddenError) {
      return null;
    }
    throw error;
  }
}
