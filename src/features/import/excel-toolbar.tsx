"use client";

import { Download } from "lucide-react";
import { Can } from "@/components/shared/can";
import { ExportExcelButton } from "@/features/import/export-excel-button";
import { ImportWizard } from "@/features/import/import-wizard";
import { Button } from "@/components/ui/button";
import type { PermissionCode } from "@/lib/rbac/permissions";

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
      <ExportExcelButton
        exportPermission={exportPermission}
        exportHref={exportHref}
        filterParams={filterParams}
      />
    </div>
  );
}
