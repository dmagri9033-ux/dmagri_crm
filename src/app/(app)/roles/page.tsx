import { CreateRoleDialog } from "@/features/roles/create-role-dialog";
import { RolesTable } from "@/features/roles/roles-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listRoles } from "@/lib/db/roles";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";

export default async function RolesPage() {
  const ctx = await requirePagePermission("role.view");
  if (!ctx) return <PageForbidden />;

  const roles = await listRoles();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Roles</h2>
        </div>
        <CreateRoleDialog />
      </div>

      <RolesTable roles={roles} />
    </div>
  );
}
