"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  commitImportAction,
  getImportBatchAction,
  uploadImportAction,
  type ExcelImportActionState,
} from "@/actions/excel-import";
import { Can } from "@/components/shared/can";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ImportBatchWithRows } from "@/lib/db/import-batches";
import type { PermissionCode } from "@/lib/rbac/permissions";

function UploadButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Validating…" : "Upload & preview"}
    </Button>
  );
}

function CommitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Importing…" : "Confirm import"}
    </Button>
  );
}

type ImportWizardProps = {
  module: "inquiries" | "customers";
  permission: PermissionCode;
  title: string;
};

export function ImportWizard({ module, permission, title }: ImportWizardProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "done">("upload");
  const [batch, setBatch] = useState<ImportBatchWithRows | null>(null);
  const [duplicateMode, setDuplicateMode] = useState<"skip" | "update">("skip");
  const [loadingBatch, startLoadBatch] = useTransition();

  const [uploadState, uploadAction] = useActionState<
    ExcelImportActionState,
    FormData
  >(uploadImportAction, {});
  const [commitState, commitAction] = useActionState<
    ExcelImportActionState,
    FormData
  >(commitImportAction, {});

  useEffect(() => {
    if (uploadState.batchId && uploadState.success) {
      startLoadBatch(async () => {
        const data = await getImportBatchAction(uploadState.batchId!);
        setBatch(data);
        setStep("preview");
      });
    }
  }, [uploadState.batchId, uploadState.success]);

  useEffect(() => {
    if (commitState.success) {
      setStep("done");
      router.refresh();
    }
  }, [commitState.success, router]);

  function reset() {
    setStep("upload");
    setBatch(null);
    setDuplicateMode("skip");
  }

  return (
    <Can permission={permission}>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        Import Excel
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) reset();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Upload → preview (with errors) → confirm. Max 1000 rows / 5 MB.
              Duplicate mobiles are never created silently.
            </DialogDescription>
          </DialogHeader>

          {step === "upload" ? (
            <form action={uploadAction} className="space-y-4">
              <input type="hidden" name="module" value={module} />
              {uploadState.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{uploadState.error}</AlertDescription>
                </Alert>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor={`file-${module}`}>Excel file (.xlsx)</Label>
                <Input
                  id={`file-${module}`}
                  name="file"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Download the template first so column headers match exactly.
              </p>
              <div className="flex justify-end">
                <UploadButton />
              </div>
            </form>
          ) : null}

          {step === "preview" && batch ? (
            <div className="space-y-4">
              {loadingBatch ? (
                <p className="text-sm text-muted-foreground">Loading preview…</p>
              ) : null}
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="secondary">Total {batch.total_rows}</Badge>
                <Badge variant="secondary">Valid {batch.valid_rows}</Badge>
                <Badge variant="destructive">Errors {batch.error_rows}</Badge>
                <Badge variant="outline">
                  Duplicates {batch.rows.filter((r) => r.is_duplicate).length}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`dup-${module}`}>Duplicate mobile handling</Label>
                <select
                  id={`dup-${module}`}
                  value={duplicateMode}
                  onChange={(e) =>
                    setDuplicateMode(e.target.value as "skip" | "update")
                  }
                  className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                >
                  <option value="skip">Skip duplicates</option>
                  <option value="update">Update existing customers</option>
                </select>
              </div>

              <div className="max-h-56 overflow-auto rounded-lg border text-sm">
                <table className="w-full min-w-[520px]">
                  <thead className="bg-muted/50 text-left">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batch.rows.slice(0, 50).map((row) => (
                      <tr key={row.id} className="border-t align-top">
                        <td className="px-3 py-2">{row.row_number}</td>
                        <td className="px-3 py-2">
                          {row.is_valid ? (
                            <Badge variant="secondary">
                              {row.is_duplicate ? "Valid · duplicate mobile" : "Valid"}
                            </Badge>
                          ) : (
                            <Badge variant="destructive">Invalid</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {Array.isArray(row.errors)
                            ? (row.errors as string[]).join("; ") || "—"
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batch.rows.length > 50 ? (
                  <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                    Showing first 50 of {batch.rows.length} rows.
                  </p>
                ) : null}
              </div>

              {commitState.error ? (
                <Alert variant="destructive">
                  <AlertDescription>{commitState.error}</AlertDescription>
                </Alert>
              ) : null}

              <form action={commitAction} className="flex flex-wrap justify-end gap-2">
                <input type="hidden" name="batchId" value={batch.id} />
                <input type="hidden" name="duplicateMode" value={duplicateMode} />
                <Button type="button" variant="outline" onClick={reset}>
                  Back
                </Button>
                <Button type="submit" disabled={batch.valid_rows === 0}>
                  Confirm import
                </Button>
              </form>
              {batch.valid_rows === 0 ? (
                <p className="text-xs text-destructive">
                  No valid rows to import. Fix the file and upload again.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "done" ? (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  {commitState.success}
                  {commitState.summary
                    ? ` (created ${commitState.summary.created ?? 0}, updated ${commitState.summary.updated ?? 0}, skipped ${commitState.summary.skipped ?? 0})`
                    : null}
                </AlertDescription>
              </Alert>
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    reset();
                  }}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Can>
  );
}
