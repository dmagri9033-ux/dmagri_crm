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
  createFollowupGridRowAction,
  loadFollowupsGridAction,
  patchFollowupFieldAction,
} from "@/actions/followups";
import {
  gridCellInputClass,
  gridCellSelectClass,
  GridSaveIndicator,
  todayIstDate,
  type GridSaveState,
} from "@/components/shared/data-grid";
import { usePermissions } from "@/components/providers/permissions-provider";
import { Button } from "@/components/ui/button";
import { DeleteFollowupButton } from "@/features/follow-ups/delete-followup-button";
import type { FollowupInquiryOption } from "@/features/follow-ups/followup-form";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import type { Customer } from "@/lib/db/customers";
import type { FollowupWithRelations } from "@/lib/db/followups";
import type { FollowupFilterInput } from "@/validations/followup";
import { cn } from "@/lib/utils";

function displayMobile(followup: FollowupWithRelations): string {
  const raw =
    followup.customers?.mobile ||
    followup.customers?.mobile_normalized ||
    "";
  const normalized = normalizeMobile(raw);
  if (normalized && normalized.length === 12 && normalized.startsWith("91")) {
    return normalized.slice(2);
  }
  return raw.replace(/\D/g, "").slice(-10) || raw;
}

function inquiryLabel(inquiry: FollowupInquiryOption): string {
  const product = inquiry.product_name_snapshot || "Inquiry";
  return `${inquiry.inquiry_date} · ${product}`;
}

function inquiriesForRow(
  customerId: string,
  currentInquiryId: string | null,
  all: FollowupInquiryOption[],
): FollowupInquiryOption[] {
  const filtered = all.filter((i) => i.customer_id === customerId);
  const pool = filtered.length > 0 ? filtered : all;
  if (currentInquiryId && !pool.some((i) => i.id === currentInquiryId)) {
    const current = all.find((i) => i.id === currentInquiryId);
    if (current) return [current, ...pool];
  }
  return pool;
}

function FollowupEditableRow({
  followup,
  inquiries,
  canUpdate,
  onUpdated,
  onDeleted,
}: {
  followup: FollowupWithRelations;
  inquiries: FollowupInquiryOption[];
  canUpdate: boolean;
  onUpdated: (followup: FollowupWithRelations) => void;
  onDeleted: (id: string) => void;
}) {
  const [saveState, setSaveState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(followup.followup_date);
  const [mobile, setMobile] = useState(() => displayMobile(followup));
  const [notes, setNotes] = useState(followup.notes);
  const [inquiryId, setInquiryId] = useState(followup.inquiry_id ?? "");

  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingFieldRef = useRef<"mobile" | "notes" | null>(null);
  const mobileDirtyRef = useRef(false);
  const notesDirtyRef = useRef(false);

  useEffect(() => {
    if (editingFieldRef.current !== "mobile" && !mobileDirtyRef.current) {
      setMobile(displayMobile(followup));
    }
    if (editingFieldRef.current !== "notes" && !notesDirtyRef.current) {
      setNotes(followup.notes);
    }
    setDate(followup.followup_date);
    setInquiryId(followup.inquiry_id ?? "");
  }, [followup]);

  const saveField = useCallback(
    async (
      field: "followup_date" | "notes" | "mobile" | "inquiry_id",
      value: string,
    ) => {
      if (!canUpdate) return;
      setSaveState("saving");
      setError(undefined);
      const result = await patchFollowupFieldAction({
        followupId: followup.id,
        field,
        value,
      });
      if (result.error) {
        setSaveState("error");
        setError(result.error);
        if (field === "mobile") {
          setMobile(displayMobile(followup));
          mobileDirtyRef.current = false;
        }
        if (field === "notes") {
          setNotes(followup.notes);
          notesDirtyRef.current = false;
        }
        return;
      }
      if (field === "mobile") mobileDirtyRef.current = false;
      if (field === "notes") notesDirtyRef.current = false;
      if (result.followup) onUpdated(result.followup);
      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1200);
    },
    [canUpdate, followup, onUpdated],
  );

  function scheduleMobileSave(value: string) {
    if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
    mobileDebounceRef.current = setTimeout(() => {
      void saveField("mobile", value);
    }, 700);
  }

  const inquiryOptions = inquiriesForRow(
    followup.customer_id,
    followup.inquiry_id,
    inquiries,
  );

  const mobileLabel = displayMobile(followup) || "this follow-up";

  return (
    <tr className="border-t odd:bg-muted/20">
      <td className="p-1.5">
        <input
          type="date"
          className={gridCellInputClass}
          value={date}
          disabled={!canUpdate}
          onChange={(e) => {
            setDate(e.target.value);
            void saveField("followup_date", e.target.value);
          }}
        />
      </td>
      <td className="p-1.5">
        <div className="flex flex-col gap-0.5">
          <input
            type="tel"
            inputMode="tel"
            className={cn(gridCellInputClass, "font-medium tabular-nums")}
            value={mobile}
            disabled={!canUpdate}
            placeholder="Mobile number"
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
              if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
              if (mobile.trim() && mobile !== displayMobile(followup)) {
                void saveField("mobile", mobile);
              } else {
                mobileDirtyRef.current = false;
              }
            }}
          />
          {followup.customer_id ? (
            <Link
              href={`/customers/${followup.customer_id}`}
              className="px-2 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Open 360°
            </Link>
          ) : null}
        </div>
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
            if (notes.trim() !== followup.notes) {
              void saveField("notes", notes);
            } else {
              notesDirtyRef.current = false;
            }
          }}
        />
      </td>
      <td className="p-1.5">
        <select
          className={gridCellSelectClass}
          value={inquiryId}
          disabled={!canUpdate}
          onChange={(e) => {
            setInquiryId(e.target.value);
            void saveField("inquiry_id", e.target.value);
          }}
        >
          <option value="">—</option>
          {inquiryOptions.map((inquiry) => (
            <option key={inquiry.id} value={inquiry.id}>
              {inquiryLabel(inquiry)}
            </option>
          ))}
        </select>
      </td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <GridSaveIndicator state={saveState} error={error} />
          <DeleteFollowupButton
            followupId={followup.id}
            label={mobileLabel}
            onDeleted={() => onDeleted(followup.id)}
          />
        </div>
      </td>
    </tr>
  );
}

function NewFollowupRow({
  customers,
  inquiries,
  canCreate,
  onCreated,
}: {
  customers: Customer[];
  inquiries: FollowupInquiryOption[];
  canCreate: boolean;
  onCreated: (followup: FollowupWithRelations) => void;
}) {
  const [, startTransition] = useTransition();
  const savingRef = useRef(false);
  const [date, setDate] = useState(todayIstDate());
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");
  const [inquiryId, setInquiryId] = useState("");
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<GridSaveState>("idle");

  const normalizedMobile = normalizeMobile(mobile.trim());
  const matchedCustomer = normalizedMobile
    ? customers.find(
        (c) =>
          c.mobile_normalized === normalizedMobile ||
          normalizeMobile(c.mobile) === normalizedMobile,
      )
    : undefined;
  const filtered = matchedCustomer
    ? inquiries.filter((i) => i.customer_id === matchedCustomer.id)
    : [];
  const inquiryOptions = filtered.length > 0 ? filtered : inquiries;

  function reset() {
    setDate(todayIstDate());
    setMobile("");
    setNotes("");
    setInquiryId("");
  }

  async function saveNewRow() {
    if (!canCreate || savingRef.current) return;
    const trimmedMobile = mobile.trim();
    const trimmedNotes = notes.trim();
    if (!trimmedMobile) {
      setError("Mobile number is required");
      setStatus("error");
      return;
    }
    if (!normalizeMobile(trimmedMobile)) {
      setError("Enter a valid mobile number");
      setStatus("error");
      return;
    }
    if (!trimmedNotes) {
      setError("Notes are required");
      setStatus("error");
      return;
    }

    savingRef.current = true;
    setStatus("saving");
    setError(undefined);
    try {
      const result = await createFollowupGridRowAction({
        mobile: trimmedMobile,
        followup_date: date,
        inquiry_id: inquiryId || null,
        notes: trimmedNotes,
      });
      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }
      setStatus("saved");
      reset();
      if (result.followup) {
        startTransition(() => onCreated(result.followup!));
      }
      setTimeout(() => setStatus("idle"), 1000);
    } finally {
      savingRef.current = false;
    }
  }

  if (!canCreate) return null;

  return (
    <tr className="border-t border-dashed bg-primary/5">
      <td className="p-1.5">
        <input
          type="date"
          className={gridCellInputClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </td>
      <td className="p-1.5">
        <input
          type="tel"
          inputMode="tel"
          className={cn(gridCellInputClass, "font-medium tabular-nums")}
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
      <td className="p-1.5">
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[8rem]")}
          value={notes}
          placeholder="Notes *"
          onChange={(e) => setNotes(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void saveNewRow();
            }
          }}
        />
      </td>
      <td className="p-1.5">
        <select
          className={gridCellSelectClass}
          value={inquiryId}
          onChange={(e) => setInquiryId(e.target.value)}
        >
          <option value="">—</option>
          {inquiryOptions.map((inquiry) => (
            <option key={inquiry.id} value={inquiry.id}>
              {inquiryLabel(inquiry)}
            </option>
          ))}
        </select>
      </td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <GridSaveIndicator state={status} error={error} />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={status === "saving"}
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

export function FollowupsTable({
  followups: initialFollowups,
  customers,
  inquiries,
  filters,
}: {
  followups: FollowupWithRelations[];
  customers: Customer[];
  inquiries: FollowupInquiryOption[];
  filters: Partial<FollowupFilterInput>;
}) {
  const { can } = usePermissions();
  const canUpdate = can("followup.update");
  const canCreate = can("followup.create");

  const [rows, setRows] = useState(initialFollowups);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    const result = await loadFollowupsGridAction(filters);
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }
    setRows(result.followups ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [filterKey, reload]);

  function upsertRow(followup: FollowupWithRelations) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === followup.id);
      if (idx === -1) return [followup, ...prev];
      const next = [...prev];
      next[idx] = followup;
      return next;
    });
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
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
          Failed to load follow-ups: {loadError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2.5 py-2.5 font-semibold">Date</th>
              <th className="px-2.5 py-2.5 font-semibold">Mo No.</th>
              <th className="px-2.5 py-2.5 font-semibold">Notes</th>
              <th className="px-2.5 py-2.5 font-semibold">Inquiry</th>
              <th className="px-2.5 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading follow-ups…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No follow-ups yet. Use the row below to add the first one.
                </td>
              </tr>
            ) : (
              rows.map((followup) => (
                <FollowupEditableRow
                  key={followup.id}
                  followup={followup}
                  inquiries={inquiries}
                  canUpdate={canUpdate}
                  onUpdated={upsertRow}
                  onDeleted={removeRow}
                />
              ))
            )}
            <NewFollowupRow
              customers={customers}
              inquiries={inquiries}
              canCreate={canCreate}
              onCreated={(followup) => {
                upsertRow(followup);
              }}
            />
          </tbody>
        </table>
      </div>
    </div>
  );
}
