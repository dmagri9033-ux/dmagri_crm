"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { PermissionCode } from "@/lib/rbac/permissions";

type PermissionsContextValue = {
  permissions: Set<PermissionCode>;
  can: (permission: PermissionCode | PermissionCode[]) => boolean;
  canAny: (permissions: PermissionCode[]) => boolean;
};

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({
  permissions,
  children,
}: {
  permissions: PermissionCode[];
  children: ReactNode;
}) {
  const value = useMemo<PermissionsContextValue>(() => {
    const set = new Set(permissions);
    return {
      permissions: set,
      can(required) {
        const needed = Array.isArray(required) ? required : [required];
        return needed.every((code) => set.has(code));
      },
      canAny(codes) {
        return codes.some((code) => set.has(code));
      },
    };
  }, [permissions]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error("usePermissions must be used within PermissionsProvider");
  }
  return ctx;
}
