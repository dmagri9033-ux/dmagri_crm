"use client";

import { Download, FileDown } from "lucide-react";
import { Can } from "@/components/shared/can";
import { ImportWizard } from "@/features/import/import-wizard";
import { Button } from "@/components/ui/button";
import type { PermissionCode } from "@/lib/rbac/permissions";

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && value !== "all") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function ExcelToolbar({
  module,
  importPermission,
  exportPermission,
  exportHref,
  filterParams,
}: {
  module: "inquiries" | "customers";
  importPermission: PermissionCode;
  exportPermission: PermissionCode;
  exportHref: string;
  filterParams: Record<string, string | undefined>;
}) {
  const exportUrl = `${exportHref}${buildQuery(filterParams)}`;
  const templateUrl = `/api/excel/template/${module}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Can permission={importPermission}>
        <Button
          render={<a href={templateUrl} />}
          variant="outline"
          size="sm"
          nativeButton={false}
        >
          <Download className="size-4" />
          Template
        </Button>
      </Can>
      <ImportWizard
        module={module}
        permission={importPermission}
        title={module === "inquiries" ? "Import inquiries" : "Import customers"}
      />
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
    </div>
  );
}
