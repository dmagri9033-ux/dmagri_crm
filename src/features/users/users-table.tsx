import { Badge } from "@/components/ui/badge";
import { EditUserDialog } from "@/features/users/edit-user-dialog";
import { UserRowActions } from "@/features/users/user-row-actions";
import type { UserRoleLite, UserRow } from "@/lib/db/users";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function UsersTable({
  users,
  roles,
}: {
  users: UserRow[];
  roles: UserRoleLite[];
}) {
  if (users.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No users match your filters. Create a user to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[820px] text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">User</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="border-t align-top">
              <td className="px-4 py-3">
                <div className="font-medium">{user.display_name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </td>
              <td className="px-4 py-3">
                {user.role?.name ?? "—"}
              </td>
              <td className="px-4 py-3">
                <Badge variant={user.is_active ? "secondary" : "outline"}>
                  {user.is_active ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(user.created_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-end gap-2">
                  <EditUserDialog user={user} roles={roles} />
                  <UserRowActions user={user} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
