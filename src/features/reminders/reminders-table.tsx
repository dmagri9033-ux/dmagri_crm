"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import {
  createReminderGridRowAction,
  loadRemindersGridAction,
  patchReminderFieldAction,
} from "@/actions/reminders";
import {
  GridSaveIndicator,
  gridCellInputClass,
  gridCellNumberClass,
  gridCellSelectClass,
  type GridSaveState,
} from "@/components/shared/data-grid";
import { usePermissions } from "@/components/providers/permissions-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReminderStatusActions } from "@/features/reminders/reminder-status-actions";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import {
  toDatetimeLocalIst,
  type ReminderUiStatus,
} from "@/lib/datetime/ist";
import type { ProfileLite, ReminderWithRelations } from "@/lib/db/reminders";
import { cn } from "@/lib/utils";
import type { ReminderFilterInput } from "@/validations/reminder";

function defaultRemindAtLocal(): string {
  return toDatetimeLocalIst(new Date(Date.now() + 3_600_000));
}

function displayMobile(reminder: ReminderWithRelations): string {
  const raw =
    reminder.customers?.mobile ||
    reminder.customers?.mobile_normalized ||
    "";
  const normalized = normalizeMobile(raw);
  if (normalized && normalized.length === 12 && normalized.startsWith("91")) {
    return normalized.slice(2);
  }
  return raw.replace(/\D/g, "").slice(-10) || raw;
}

function statusBadge(status: ReminderUiStatus) {
  switch (status) {
    case "overdue":
      return <Badge variant="destructive">Overdue</Badge>;
    case "today":
      return <Badge variant="secondary">Today</Badge>;
    case "upcoming":
      return <Badge variant="outline">Upcoming</Badge>;
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
  }
}

function ReminderEditableRow({
  reminder,
  assignees,
  canUpdate,
  onUpdated,
  onReload,
}: {
  reminder: ReminderWithRelations;
  assignees: ProfileLite[];
  canUpdate: boolean;
  onUpdated: (reminder: ReminderWithRelations) => void;
  onReload: () => void;
}) {
  const [saveState, setSaveState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const [whenLocal, setWhenLocal] = useState(() =>
    toDatetimeLocalIst(reminder.remind_at),
  );
  const [title, setTitle] = useState(reminder.title);
  const [mobile, setMobile] = useState(displayMobile(reminder));
  const [assigneeId, setAssigneeId] = useState(reminder.assigned_user_id);
  const [notes, setNotes] = useState(reminder.notes ?? "");
  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingFieldRef = useRef<"mobile" | "title" | "notes" | null>(null);
  const mobileDirtyRef = useRef(false);
  const titleDirtyRef = useRef(false);
  const notesDirtyRef = useRef(false);

  useEffect(() => {
    if (editingFieldRef.current !== "mobile" && !mobileDirtyRef.current) {
      setMobile(displayMobile(reminder));
    }
    if (editingFieldRef.current !== "title" && !titleDirtyRef.current) {
      setTitle(reminder.title);
    }
    if (editingFieldRef.current !== "notes" && !notesDirtyRef.current) {
      setNotes(reminder.notes ?? "");
    }
    setWhenLocal(toDatetimeLocalIst(reminder.remind_at));
    setAssigneeId(reminder.assigned_user_id);
  }, [reminder]);

  const saveField = useCallback(
    async (
      field:
        | "title"
        | "notes"
        | "remind_at"
        | "mobile"
        | "assigned_user_id",
      value: string,
    ) => {
      if (!canUpdate) return;
      setSaveState("saving");
      setError(undefined);
      const result = await patchReminderFieldAction({
        reminderId: reminder.id,
        field,
        value,
      });
      if (result.error) {
        setSaveState("error");
        setError(result.error);
        if (field === "mobile") {
          setMobile(displayMobile(reminder));
          mobileDirtyRef.current = false;
        }
        if (field === "title") {
          setTitle(reminder.title);
          titleDirtyRef.current = false;
        }
        if (field === "notes") {
          setNotes(reminder.notes ?? "");
          notesDirtyRef.current = false;
        }
        if (field === "remind_at") {
          setWhenLocal(toDatetimeLocalIst(reminder.remind_at));
        }
        if (field === "assigned_user_id") {
          setAssigneeId(reminder.assigned_user_id);
        }
        return;
      }
      if (field === "mobile") mobileDirtyRef.current = false;
      if (field === "title") titleDirtyRef.current = false;
      if (field === "notes") notesDirtyRef.current = false;
      if (result.reminder) onUpdated(result.reminder);
      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1200);
    },
    [canUpdate, reminder, onUpdated],
  );

  function scheduleMobileSave(value: string) {
    if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
    mobileDebounceRef.current = setTimeout(() => {
      void saveField("mobile", value);
    }, 700);
  }

  const assigneeOptions = assignees.slice();
  if (
    reminder.assigned_profile &&
    !assigneeOptions.some((a) => a.id === reminder.assigned_profile?.id)
  ) {
    assigneeOptions.unshift(reminder.assigned_profile);
  }

  return (
    <tr className="border-t odd:bg-muted/20">
      <td className="p-1.5">
        <input
          type="datetime-local"
          className={cn(gridCellNumberClass, "min-w-[11rem]")}
          value={whenLocal}
          disabled={!canUpdate}
          onChange={(e) => {
            setWhenLocal(e.target.value);
            void saveField("remind_at", e.target.value);
          }}
        />
      </td>
      <td className="p-1.5">
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[10rem] font-medium")}
          value={title}
          disabled={!canUpdate}
          placeholder="Title"
          onFocus={() => {
            editingFieldRef.current = "title";
          }}
          onChange={(e) => {
            titleDirtyRef.current = true;
            setTitle(e.target.value);
          }}
          onBlur={() => {
            editingFieldRef.current = null;
            if (title.trim() !== reminder.title) {
              void saveField("title", title);
            } else {
              titleDirtyRef.current = false;
            }
          }}
        />
      </td>
      <td className="p-1.5">
        <div className="flex flex-col gap-0.5">
          <input
            type="tel"
            inputMode="tel"
            className={gridCellNumberClass}
            value={mobile}
            disabled={!canUpdate}
            placeholder="Mobile"
            onFocus={() => {
              editingFieldRef.current = "mobile";
            }}
            onChange={(e) => {
              mobileDirtyRef.current = true;
              setMobile(e.target.value);
              scheduleMobileSave(e.target.value);
            }}
            onBlur={() => {
              editingFieldRef.current = null;
              if (mobileDebounceRef.current) {
                clearTimeout(mobileDebounceRef.current);
              }
              if (mobile.trim() && mobile !== displayMobile(reminder)) {
                void saveField("mobile", mobile);
              } else {
                mobileDirtyRef.current = false;
              }
            }}
          />
          {reminder.customer_id ? (
            <Link
              href={`/customers/${reminder.customer_id}`}
              className="px-2 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
            >
              {reminder.customers?.name ?? "Open 360°"}
            </Link>
          ) : null}
        </div>
      </td>
      <td className="p-1.5 text-sm text-muted-foreground">
        {reminder.product_name || "—"}
      </td>
      <td className="p-1.5">
        <select
          className={gridCellSelectClass}
          value={assigneeId}
          disabled={!canUpdate}
          onChange={(e) => {
            setAssigneeId(e.target.value);
            void saveField("assigned_user_id", e.target.value);
          }}
        >
          {assigneeOptions.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name || profile.email || profile.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </td>
      <td className="p-1.5">
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[10rem]")}
          value={notes}
          disabled={!canUpdate}
          placeholder="Notes"
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            editingFieldRef.current = "notes";
          }}
          onChange={(e) => {
            notesDirtyRef.current = true;
            setNotes(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.stopPropagation();
          }}
          onBlur={() => {
            editingFieldRef.current = null;
            const next = notes;
            const prev = reminder.notes ?? "";
            if (next !== prev) {
              void saveField("notes", next);
            } else {
              notesDirtyRef.current = false;
            }
          }}
        />
      </td>
      <td className="p-1.5">
        <div className="flex flex-wrap gap-1">
          {statusBadge(reminder.ui_status)}
          {reminder.actively_snoozed ? (
            <Badge variant="outline">Snoozed</Badge>
          ) : null}
        </div>
      </td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <GridSaveIndicator state={saveState} error={error} />
          <div className="flex flex-wrap justify-end gap-1">
            <ReminderStatusActions
              reminder={reminder}
              onSuccess={onReload}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

function NewReminderRow({
  assignees,
  defaultAssigneeId,
  canCreate,
  onCreated,
}: {
  assignees: ProfileLite[];
  defaultAssigneeId: string;
  canCreate: boolean;
  onCreated: (reminder: ReminderWithRelations) => void;
}) {
  const [pending, startTransition] = useTransition();
  const savingRef = useRef(false);
  const [whenLocal, setWhenLocal] = useState(defaultRemindAtLocal);
  const [title, setTitle] = useState("");
  const [mobile, setMobile] = useState("");
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<GridSaveState>("idle");

  function reset() {
    setWhenLocal(defaultRemindAtLocal());
    setTitle("");
    setMobile("");
    setAssigneeId(defaultAssigneeId);
    setNotes("");
  }

  async function saveNewRow() {
    if (!canCreate || savingRef.current) return;
    const trimmedMobile = mobile.trim();
    const trimmedTitle = title.trim();
    if (!trimmedMobile || !trimmedTitle) {
      setError("Mobile and title are required");
      setStatus("error");
      return;
    }
    if (!normalizeMobile(trimmedMobile)) {
      setError("Enter a valid mobile number");
      setStatus("error");
      return;
    }

    savingRef.current = true;
    setStatus("saving");
    setError(undefined);
    try {
      const result = await createReminderGridRowAction({
        mobile: trimmedMobile,
        title: trimmedTitle,
        remind_at_local: whenLocal,
        notes,
        assigned_user_id: assigneeId,
      });
      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }
      setStatus("saved");
      reset();
      if (result.reminder) {
        startTransition(() => onCreated(result.reminder!));
      }
      setTimeout(() => setStatus("idle"), 1000);
    } finally {
      savingRef.current = false;
    }
  }

  if (!canCreate) return null;

  return (
    <tr className="border-b border-dashed bg-primary/5">
      <td className="p-1.5">
        <input
          type="datetime-local"
          className={cn(gridCellNumberClass, "min-w-[11rem]")}
          value={whenLocal}
          onChange={(e) => setWhenLocal(e.target.value)}
        />
      </td>
      <td className="p-1.5">
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[10rem] font-medium")}
          value={title}
          placeholder="Title *"
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveNewRow();
            }
          }}
        />
      </td>
      <td className="p-1.5">
        <input
          type="tel"
          inputMode="tel"
          className={gridCellNumberClass}
          value={mobile}
          placeholder="Mobile number *"
          onChange={(e) => setMobile(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveNewRow();
            }
          }}
        />
      </td>
      <td className="p-1.5 text-xs text-muted-foreground">—</td>
      <td className="p-1.5">
        <select
          className={gridCellSelectClass}
          value={assigneeId}
          onChange={(e) => setAssigneeId(e.target.value)}
        >
          {assignees.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.display_name || profile.email || profile.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </td>
      <td className="p-1.5">
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[8rem]")}
          value={notes}
          placeholder="Notes"
          onChange={(e) => setNotes(e.target.value)}
        />
      </td>
      <td className="p-1.5 text-xs text-muted-foreground">—</td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <GridSaveIndicator state={pending ? "saving" : status} error={error} />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/30"
            disabled={pending}
            onClick={() => void saveNewRow()}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function RemindersTable({
  reminders: initialReminders,
  assignees,
  defaultAssigneeId,
  filters,
}: {
  reminders: ReminderWithRelations[];
  assignees: ProfileLite[];
  defaultAssigneeId: string;
  filters: Partial<ReminderFilterInput>;
}) {
  const { can } = usePermissions();
  const canUpdate = can("reminder.update");
  const canCreate = can("reminder.create");

  const [rows, setRows] = useState(initialReminders);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    const result = await loadRemindersGridAction(filters);
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }
    setRows(result.reminders ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [filterKey, reload]);

  function upsertRow(reminder: ReminderWithRelations) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === reminder.id);
      if (idx === -1) return [reminder, ...prev];
      const next = [...prev];
      next[idx] = reminder;
      return next;
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => void reload()}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          Refresh
        </Button>
      </div>

      {loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load reminders: {loadError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1180px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2.5 py-2.5 font-semibold">When</th>
              <th className="px-2.5 py-2.5 font-semibold">Title</th>
              <th className="px-2.5 py-2.5 font-semibold">Mo No.</th>
              <th className="px-2.5 py-2.5 font-semibold">Product</th>
              <th className="px-2.5 py-2.5 font-semibold">Assignee</th>
              <th className="px-2.5 py-2.5 font-semibold">Notes</th>
              <th className="px-2.5 py-2.5 font-semibold">Status</th>
              <th className="px-2.5 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <NewReminderRow
              assignees={assignees}
              defaultAssigneeId={defaultAssigneeId}
              canCreate={canCreate}
              onCreated={(reminder) => {
                upsertRow(reminder);
              }}
            />
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading reminders…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No reminders match your filters. Use the row above to add one.
                </td>
              </tr>
            ) : (
              rows.map((reminder) => (
                <ReminderEditableRow
                  key={reminder.id}
                  reminder={reminder}
                  assignees={assignees}
                  canUpdate={canUpdate}
                  onUpdated={upsertRow}
                  onReload={() => void reload()}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
