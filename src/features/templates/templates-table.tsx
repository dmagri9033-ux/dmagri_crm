"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, ImagePlus, Plus, Trash2 } from "lucide-react";
import {
  createTemplateGridRowAction,
  deleteTemplateAction,
  loadTemplatesGridAction,
  patchTemplateFieldAction,
  uploadTemplateImageAction,
} from "@/actions/templates";
import {
  GridSaveIndicator,
  gridAddRowClass,
  gridCellInputClass,
  gridCellPad,
  gridCellSelectClass,
  gridDataRowClass,
  gridHeaderCellClass,
  gridHeaderRowClass,
  gridTableClass,
  type GridSaveState,
} from "@/components/shared/data-grid";
import { usePermissions } from "@/components/providers/permissions-provider";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/shared/can";
import type { WhatsAppTemplate } from "@/lib/db/templates";
import { getTemplateImageUrl } from "@/lib/templates/template-image-url";
import type { TemplateFilterInput } from "@/validations/template";
import { cn } from "@/lib/utils";

function TemplateImageCell({
  templateId,
  storagePath,
  canUpdate,
  onUpdated,
}: {
  templateId: string;
  storagePath: string | null;
  canUpdate: boolean;
  onUpdated: (template: WhatsAppTemplate) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const url = getTemplateImageUrl(storagePath);

  async function onFileChange(file: File | undefined) {
    if (!file || !canUpdate) return;
    setUploadState("saving");
    setError(undefined);
    const fd = new FormData();
    fd.set("templateId", templateId);
    fd.set("image", file);
    const result = await uploadTemplateImageAction({}, fd);
    if (result.error) {
      setUploadState("error");
      setError(result.error);
      return;
    }
    if (result.template) onUpdated(result.template);
    setUploadState("saved");
    setTimeout(() => setUploadState("idle"), 1200);
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="text-[10px] text-muted-foreground">No image</span>
        )}
      </div>
      {canUpdate ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              void onFileChange(f);
              e.target.value = "";
            }}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="bg-muted/60 hover:bg-muted"
            title="Change image"
            aria-label="Change image"
            onClick={() => inputRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
          </Button>
        </>
      ) : null}
      <GridSaveIndicator state={uploadState} error={error} />
    </div>
  );
}

function TemplateRow({
  template,
  canUpdate,
  onUpdated,
  onDeleted,
}: {
  template: WhatsAppTemplate;
  canUpdate: boolean;
  onUpdated: (template: WhatsAppTemplate) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(template.name);
  const [content, setContent] = useState(template.content);
  const [active, setActive] = useState(template.is_active);
  const [saveState, setSaveState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const editingNameRef = useRef(false);
  const editingContentRef = useRef(false);
  const dirtyNameRef = useRef(false);
  const dirtyContentRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editingNameRef.current && !dirtyNameRef.current) setName(template.name);
    if (!editingContentRef.current && !dirtyContentRef.current) {
      setContent(template.content);
    }
    setActive(template.is_active);
  }, [template]);

  async function save(
    field: "name" | "content" | "is_active",
    value: string,
  ) {
    if (!canUpdate) return;
    setSaveState("saving");
    setError(undefined);
    const result = await patchTemplateFieldAction({
      templateId: template.id,
      field,
      value,
    });
    if (result.error) {
      setSaveState("error");
      setError(result.error);
      setName(template.name);
      setContent(template.content);
      setActive(template.is_active);
      dirtyNameRef.current = false;
      dirtyContentRef.current = false;
      return;
    }
    dirtyNameRef.current = false;
    dirtyContentRef.current = false;
    if (result.template) onUpdated(result.template);
    setSaveState("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1200);
  }

  async function remove() {
    if (!window.confirm(`Delete template "${template.name}"?`)) return;
    const fd = new FormData();
    fd.set("templateId", template.id);
    const result = await deleteTemplateAction({}, fd);
    if (result.error) {
      setSaveState("error");
      setError(result.error);
      return;
    }
    onDeleted(template.id);
  }

  async function copyContent() {
    try {
      await navigator.clipboard.writeText(template.content);
      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 800);
    } catch {
      setSaveState("error");
      setError("Could not copy to clipboard");
    }
  }

  return (
    <tr className={gridDataRowClass}>
      <td className={gridCellPad}>
        <input
          className={cn(gridCellInputClass, "min-w-[10rem] font-medium")}
          value={name}
          disabled={!canUpdate}
          onFocus={() => {
            editingNameRef.current = true;
          }}
          onChange={(e) => {
            dirtyNameRef.current = true;
            setName(e.target.value);
          }}
          onBlur={() => {
            editingNameRef.current = false;
            if (name.trim() !== template.name) void save("name", name);
            else dirtyNameRef.current = false;
          }}
        />
      </td>
      <td className={gridCellPad}>
        <TemplateImageCell
          templateId={template.id}
          storagePath={template.image_storage_path}
          canUpdate={canUpdate}
          onUpdated={onUpdated}
        />
      </td>
      <td className={gridCellPad}>
        <textarea
          className={cn(
            gridCellInputClass,
            "min-w-[16rem] resize-y leading-snug",
          )}
          rows={3}
          value={content}
          disabled={!canUpdate}
          onFocus={() => {
            editingContentRef.current = true;
          }}
          onChange={(e) => {
            dirtyContentRef.current = true;
            setContent(e.target.value);
          }}
          onBlur={() => {
            editingContentRef.current = false;
            if (content.trim() !== template.content) {
              void save("content", content);
            } else dirtyContentRef.current = false;
          }}
        />
      </td>
      <td className={gridCellPad}>
        <select
          className={cn(
            gridCellSelectClass,
            active ? "bg-emerald-500/10" : "bg-muted/40",
          )}
          value={active ? "true" : "false"}
          disabled={!canUpdate}
          onChange={(e) => {
            const next = e.target.value === "true";
            setActive(next);
            void save("is_active", next ? "true" : "false");
          }}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </td>
      <td className={gridCellPad}>
        <div className="flex items-center justify-end gap-0.5">
          <GridSaveIndicator state={saveState} error={error} />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 hover:text-sky-800 dark:text-sky-400"
            onClick={() => void copyContent()}
            title="Copy message"
            aria-label="Copy message"
          >
            <Copy className="size-3.5" />
          </Button>
          <Can permission="template.delete">
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
              onClick={() => void remove()}
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

function NewTemplateRow({
  canCreate,
  onCreated,
}: {
  canCreate: boolean;
  onCreated: (template: WhatsAppTemplate) => void;
}) {
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [active, setActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [status, setStatus] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  async function add() {
    if (!canCreate || savingRef.current) return;
    if (name.trim().length < 2) {
      setStatus("error");
      setError("Enter a template name");
      return;
    }
    if (!content.trim()) {
      setStatus("error");
      setError("Enter message content");
      return;
    }
    savingRef.current = true;
    setStatus("saving");
    setError(undefined);
    try {
      const fd = new FormData();
      fd.set("name", name);
      fd.set("content", content);
      fd.set("is_active", active ? "true" : "false");
      if (imageFile) fd.set("image", imageFile);
      const result = await createTemplateGridRowAction({}, fd);
      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }
      if (result.template) onCreated(result.template);
      setName("");
      setContent("");
      setActive(true);
      setImageFile(null);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1000);
    } finally {
      savingRef.current = false;
    }
  }

  if (!canCreate) return null;

  return (
    <tr className={gridAddRowClass}>
      <td className={gridCellPad}>
        <input
          className={cn(gridCellInputClass, "min-w-[10rem] font-medium")}
          value={name}
          placeholder="Template name *"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void add();
            }
          }}
        />
      </td>
      <td className={gridCellPad}>
        <div className="flex items-center gap-1.5">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(e) => {
              setImageFile(e.target.files?.[0] ?? null);
            }}
          />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="bg-muted/60 hover:bg-muted"
            title={imageFile ? imageFile.name : "Optional image"}
            aria-label="Optional image"
            onClick={() => imageInputRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
          </Button>
          {imageFile ? (
            <span className="max-w-[6rem] truncate text-[10px] text-muted-foreground">
              {imageFile.name}
            </span>
          ) : (
            <span className="text-[10px] text-muted-foreground">Optional</span>
          )}
        </div>
      </td>
      <td className={gridCellPad}>
        <textarea
          className={cn(gridCellInputClass, "min-w-[16rem] resize-y")}
          rows={2}
          value={content}
          placeholder="WhatsApp message body *"
          onChange={(e) => setContent(e.target.value)}
        />
      </td>
      <td className={gridCellPad}>
        <select
          className={gridCellSelectClass}
          value={active ? "true" : "false"}
          onChange={(e) => setActive(e.target.value === "true")}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </td>
      <td className={gridCellPad}>
        <div className="flex items-center justify-end gap-0.5">
          <GridSaveIndicator state={status} error={error} />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/30"
            onClick={() => void add()}
            title="Add template"
            aria-label="Add template"
          >
            <Plus className="size-3.5" />
          </Button>
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
  const { can } = usePermissions();
  const canUpdate = can("template.update");
  const canCreate = can("template.create");
  const [rows, setRows] = useState(initialTemplates);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    const result = await loadTemplatesGridAction(filters);
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }
    setRows(result.templates ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [filterKey, reload]);

  return (
    <div className="space-y-1.5">
      {loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-lg border">
        <table className={cn(gridTableClass, "min-w-[960px]")}>
          <thead>
            <tr className={gridHeaderRowClass}>
              <th className={gridHeaderCellClass}>Name</th>
              <th className={gridHeaderCellClass}>Image</th>
              <th className={gridHeaderCellClass}>Content</th>
              <th className={gridHeaderCellClass}>Status</th>
              <th className={cn(gridHeaderCellClass, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <NewTemplateRow
              canCreate={canCreate}
              onCreated={(template) => {
                setRows((prev) =>
                  [...prev, template].sort((a, b) =>
                    a.name.localeCompare(b.name),
                  ),
                );
              }}
            />
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  Loading templates…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  No templates yet. Add one in the row above for WhatsApp messages.
                </td>
              </tr>
            ) : (
              rows.map((template) => (
                <TemplateRow
                  key={template.id}
                  template={template}
                  canUpdate={canUpdate}
                  onUpdated={(next) =>
                    setRows((prev) =>
                      prev.map((r) => (r.id === next.id ? next : r)),
                    )
                  }
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
