import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteRoleButton } from "@/features/roles/delete-role-button";
import { RoleForm } from "@/features/roles/role-form";
import { Can } from "@/components/shared/can";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getRoleWithPermissions, listRoles } from "@/lib/db/roles";
import { isPermissionCode, type PermissionCode } from "@/lib/rbac/permissions";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";

export default async function RoleDetailPage({
  params,
}: {
  params: Promise<{ roleId: string }>;
}) {
  const ctx = await requirePagePermission("role.view");
  if (!ctx) return <PageForbidden />;

  const { roleId } = await params;
  const detail = await getRoleWithPermissions(roleId);
  if (!detail) notFound();

  const roles = await listRoles();
  const summary = roles.find((r) => r.id === roleId);
  const permissionCodes = detail.permissionCodes.filter(isPermissionCode) as PermissionCode[];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {detail.role.name}
            </h2>
            <Badge variant={detail.role.is_system ? "secondary" : "outline"}>
              {detail.role.is_system ? "System" : "Custom"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {permissionCodes.length} permission
            {permissionCodes.length === 1 ? "" : "s"}
            {summary ? ` · ${summary.user_count} user(s)` : null}
          </p>
        </div>
        <Button render={<Link href="/roles" />} nativeButton={false} variant="outline">
          Back to roles
        </Button>
      </div>

      <Separator />

      <Can
        permission="role.update"
        fallback={
          <p className="text-sm text-muted-foreground">
            You can view this role but cannot edit it.
          </p>
        }
      >
        <RoleForm
          mode="edit"
          roleId={detail.role.id}
          initialName={detail.role.name}
          initialDescription={detail.role.description}
          initialPermissionCodes={permissionCodes}
          isSystem={detail.role.is_system}
        />
      </Can>

      <Separator />

      <DeleteRoleButton
        roleId={detail.role.id}
        isSystem={detail.role.is_system}
        userCount={summary?.user_count ?? 0}
      />
    </div>
  );
}
