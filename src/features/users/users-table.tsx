"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadUsersGridAction,
  patchUserFieldAction,
} from "@/actions/users";
import {
  formatGridDate,
  GridSaveIndicator,
  gridCellInputClass,
  gridCellPad,
  gridCellSelectClass,
  gridDataRowClass,
  gridHeaderCellClass,
  gridHeaderRowClass,
  gridTableClass,
  type GridSaveState,
} from "@/components/shared/data-grid";
import { usePermissions } from "@/components/providers/permissions-provider";
import { UserRowActions } from "@/features/users/user-row-actions";
import { isAdministratorRoleName } from "@/lib/rbac/administrator-shared";
import type { UserRoleLite, UserRow } from "@/lib/db/users";
import type { UserFilterInput } from "@/validations/user";
import { cn } from "@/lib/utils";

function UserGridRow({
  user,
  roles,
  canUpdate,
  onUpdated,
  onDeleted,
}: {
  user: UserRow;
  roles: UserRoleLite[];
  canUpdate: boolean;
  onUpdated: (user: UserRow) => void;
  onDeleted: (id: string) => void;
}) {
  const isAdmin = isAdministratorRoleName(user.role?.name);
  const editable = canUpdate && !isAdmin;
  const [displayName, setDisplayName] = useState(user.display_name);
  const [roleId, setRoleId] = useState(user.role_id);
  const [active, setActive] = useState(user.is_active);
  const [saveState, setSaveState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const editingNameRef = useRef(false);
  const dirtyRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editingNameRef.current && !dirtyRef.current) {
      setDisplayName(user.display_name);
    }
    setRoleId(user.role_id);
    setActive(user.is_active);
  }, [user]);

  async function save(
    field: "display_name" | "role_id" | "is_active",
    value: string,
  ) {
    if (!editable) return;
    setSaveState("saving");
    setError(undefined);
    const result = await patchUserFieldAction({
      userId: user.id,
      field,
      value,
    });
    if (result.error) {
      setSaveState("error");
      setError(result.error);
      setDisplayName(user.display_name);
      setRoleId(user.role_id);
      setActive(user.is_active);
      dirtyRef.current = false;
      return;
    }
    dirtyRef.current = false;
    if (result.user) onUpdated(result.user);
    setSaveState("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1200);
  }

  return (
    <tr className={gridDataRowClass}>
      <td className={gridCellPad}>
        <input
          className={cn(gridCellInputClass, "min-w-[10rem] font-medium")}
          value={displayName}
          disabled={!editable}
          title={isAdmin ? "Administrator accounts are read-only" : undefined}
          onFocus={() => {
            editingNameRef.current = true;
          }}
          onChange={(e) => {
            dirtyRef.current = true;
            setDisplayName(e.target.value);
          }}
          onBlur={() => {
            editingNameRef.current = false;
            if (displayName.trim() !== user.display_name) {
              void save("display_name", displayName);
            } else dirtyRef.current = false;
          }}
        />
      </td>
      <td className={cn(gridCellPad, "text-muted-foreground")}>{user.email}</td>
      <td className={gridCellPad}>
        <select
          className={cn(gridCellSelectClass, "min-w-[8rem]")}
          value={roleId}
          disabled={!editable}
          title={isAdmin ? "Administrator accounts are read-only" : undefined}
          onChange={(e) => {
            const next = e.target.value;
            setRoleId(next);
            void save("role_id", next);
          }}
        >
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </td>
      <td className={gridCellPad}>
        <select
          className={cn(
            gridCellSelectClass,
            active ? "bg-emerald-500/10" : "bg-muted/40",
          )}
          value={active ? "true" : "false"}
          disabled={!editable}
          title={isAdmin ? "Administrator accounts are read-only" : undefined}
          onChange={(e) => {
            const next = e.target.value === "true";
            setActive(next);
            void save("is_active", next ? "true" : "false");
          }}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </td>
      <td
        className={cn(
          gridCellPad,
          "tabular-nums text-muted-foreground whitespace-nowrap",
        )}
      >
        {formatGridDate(user.created_at)}
      </td>
      <td className={gridCellPad}>
        <div className="flex flex-col items-end gap-0.5">
          <GridSaveIndicator state={saveState} error={error} />
          <div className="flex items-center justify-end gap-0.5">
            <UserRowActions
              user={user}
              onDeleted={onDeleted}
              readOnly={isAdmin}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

export function UsersTable({
  users: initialUsers,
  filters,
  roles,
}: {
  users: UserRow[];
  filters: Partial<UserFilterInput>;
  roles: UserRoleLite[];
}) {
  const { can } = usePermissions();
  const canUpdate = can("user.update");
  const [rows, setRows] = useState(initialUsers);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    const result = await loadUsersGridAction(filters);
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }
    setRows(result.users ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [filterKey, reload]);

  return (
    <div className="space-y-1.5">
      {loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className={cn(gridTableClass, "min-w-[920px]")}>
          <thead>
            <tr className={gridHeaderRowClass}>
              <th className={gridHeaderCellClass}>Display name</th>
              <th className={gridHeaderCellClass}>Email</th>
              <th className={gridHeaderCellClass}>Role</th>
              <th className={gridHeaderCellClass}>Status</th>
              <th className={gridHeaderCellClass}>Created</th>
              <th className={cn(gridHeaderCellClass, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  Loading users…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  No users match your filters. Create a user to get started.
                </td>
              </tr>
            ) : (
              rows.map((user) => (
                <UserGridRow
                  key={user.id}
                  user={user}
                  roles={roles}
                  canUpdate={canUpdate}
                  onUpdated={(next) =>
                    setRows((prev) =>
                      prev.map((r) => (r.id === next.id ? next : r)),
                    )
                  }
                  onDeleted={(id) => {
                    setRows((prev) => prev.filter((r) => r.id !== id));
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
