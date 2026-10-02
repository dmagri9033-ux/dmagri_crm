import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import type { PermissionCode } from "@/lib/rbac/permissions";

export async function ProtectedModulePlaceholder({
  href,
  permission,
}: {
  href: string;
  permission: PermissionCode;
}) {
  const ctx = await requirePagePermission(permission);
  if (!ctx) return <PageForbidden />;
  return <ModulePlaceholder href={href} />;
}
