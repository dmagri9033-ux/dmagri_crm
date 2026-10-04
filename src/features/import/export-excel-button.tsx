"use client";

import { FileDown } from "lucide-react";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import type { PermissionCode } from "@/lib/rbac/permissions";

export function buildExportQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function ExportExcelButton({
  exportPermission,
  exportHref,
  filterParams,
}: {
  exportPermission: PermissionCode;
  exportHref: string;
  filterParams: Record<string, string | undefined>;
}) {
  const exportUrl = `${exportHref}${buildExportQuery(filterParams)}`;

  return (
    <Can permission={exportPermission}>
      <Button
        render={<a href={exportUrl} />}
        variant="outline"
        size="sm"
        nativeButton={false}
      >
        <FileDown className="size-4" />
        Export
      </Button>
    </Can>
  );
}
