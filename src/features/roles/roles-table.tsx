import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { RoleRow } from "@/lib/db/roles";

export function RolesTable({ roles }: { roles: RoleRow[] }) {
  if (roles.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No roles found. Create the first role to get started.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Permissions</th>
            <th className="px-4 py-3 font-medium">Users</th>
            <th className="px-4 py-3 font-medium">Type</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="border-t">
              <td className="px-4 py-3">
                <Link
                  href={`/roles/${role.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {role.name}
                </Link>
                {role.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                    {role.description}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3">{role.permission_count}</td>
              <td className="px-4 py-3">{role.user_count}</td>
              <td className="px-4 py-3">
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
