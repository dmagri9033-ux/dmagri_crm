import Link from "next/link";
import {
  gridCellPad,
  gridDataRowClass,
  gridHeaderCellClass,
  gridHeaderRowClass,
  gridTableClass,
} from "@/components/shared/data-grid";
import { Badge } from "@/components/ui/badge";
import type { RoleRow } from "@/lib/db/roles";

export function RolesTable({ roles }: { roles: RoleRow[] }) {
  if (roles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
        No roles found. Create the first role to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className={gridTableClass}>
        <thead>
          <tr className={gridHeaderRowClass}>
            <th className={gridHeaderCellClass}>Role</th>
            <th className={gridHeaderCellClass}>Permissions</th>
            <th className={gridHeaderCellClass}>Users</th>
            <th className={gridHeaderCellClass}>Type</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className={gridDataRowClass}>
              <td className={gridCellPad}>
                <Link
                  href={`/roles/${role.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {role.name}
                </Link>
                {role.description ? (
                  <p className="mt-0.5 text-[10px] text-muted-foreground line-clamp-1">
                    {role.description}
                  </p>
                ) : null}
              </td>
              <td className={gridCellPad}>{role.permission_count}</td>
              <td className={gridCellPad}>{role.user_count}</td>
              <td className={gridCellPad}>
                <Badge variant={role.is_system ? "secondary" : "outline"}>
                  {role.is_system ? "System" : "Custom"}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
