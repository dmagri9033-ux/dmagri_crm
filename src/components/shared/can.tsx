"use client";

import type { ReactNode } from "react";
import { usePermissions } from "@/components/providers/permissions-provider";
import type { PermissionCode } from "@/lib/rbac/permissions";

type CanProps = {
  permission: PermissionCode | PermissionCode[];
  /** If true, require any listed permission instead of all. */
  any?: boolean;
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * UI gate only — never a security boundary.
 * Server Actions must still call authorize().
 */
export function Can({ permission, any = false, children, fallback = null }: CanProps) {
  const { can, canAny } = usePermissions();
  const allowed = any
    ? canAny(Array.isArray(permission) ? permission : [permission])
    : can(permission);

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
