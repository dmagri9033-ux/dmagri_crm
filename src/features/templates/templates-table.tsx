"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, Trash2 } from "lucide-react";
import { deleteTemplateAction } from "@/actions/templates";
import { useServerSyncedRows } from "@/hooks/use-server-synced-rows";
import {
  gridCellPad,
  gridDataRowClass,
  gridHeaderCellClass,
  gridHeaderRowClass,
  gridTableClass,
} from "@/components/shared/data-grid";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import { EditTemplateDialog } from "@/features/templates/edit-template-dialog";
import { ViewTemplateDialog } from "@/features/templates/view-template-dialog";
import type { WhatsAppTemplate } from "@/lib/db/templates";
import type { TemplateFilterInput } from "@/validations/template";
import { cn } from "@/lib/utils";

function TemplateRow({
  template,
  onDeleted,
}: {
  template: WhatsAppTemplate;
  onDeleted: (id: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(template.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setError("Could not copy");
    }
  }

  function remove() {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    setError(undefined);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("templateId", template.id);
      const result = await deleteTemplateAction({}, fd);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDeleted(template.id);
      router.refresh();
    });
  }

  return (
    <tr className={gridDataRowClass}>
      <td className={cn(gridCellPad, "align-top font-medium")}>
        {template.name}
      </td>
      <td className={cn(gridCellPad, "align-top")}>
        <p className="max-w-xl whitespace-pre-wrap text-sm leading-snug text-foreground/90 line-clamp-4">
          {template.content}
        </p>
      </td>
      <td className={cn(gridCellPad, "align-top")}>
        <span
          className={cn(
            "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
            template.is_active
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "bg-muted text-muted-foreground",
          )}
        >
          {template.is_active ? "Active" : "Inactive"}
        </span>
      </td>
      <td className={cn(gridCellPad, "align-top")}>
        <div className="flex items-center justify-end gap-0.5">
          {error ? (
            <span className="mr-1 max-w-[8rem] truncate text-[10px] text-destructive">
              {error}
            </span>
          ) : null}
          {copied ? (
            <span className="mr-1 text-[10px] text-emerald-700 dark:text-emerald-400">
              Copied
            </span>
          ) : null}
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 hover:text-emerald-800 dark:text-emerald-400"
            onClick={() => void copyContent()}
            title="Copy message"
            aria-label="Copy message"
          >
            <Copy className="size-3.5" />
          </Button>
          <ViewTemplateDialog template={template} />
          <EditTemplateDialog template={template} />
          <Can permission="template.delete">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
              disabled={pending}
              onClick={remove}
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </Can>
        </div>
      </td>
    </tr>
  );
}

export function TemplatesTable({
  templates: initialTemplates,
  filters,
}: {
  templates: WhatsAppTemplate[];
  filters: Partial<TemplateFilterInput>;
}) {
  const [rows, setRows] = useServerSyncedRows(initialTemplates);
  void filters;

  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto rounded-lg border">
        <table className={cn(gridTableClass, "min-w-[720px]")}>
          <thead>
            <tr className={gridHeaderRowClass}>
              <th className={gridHeaderCellClass}>Name</th>
              <th className={gridHeaderCellClass}>Content</th>
              <th className={gridHeaderCellClass}>Status</th>
              <th className={cn(gridHeaderCellClass, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  No templates yet. Use Add template to create one.
                </td>
              </tr>
            ) : (
              rows.map((template) => (
                <TemplateRow
                  key={template.id}
                  template={template}
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
