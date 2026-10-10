"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Eye, Loader2 } from "lucide-react";
import {
  loadFollowupsGridAction,
  patchFollowupFieldAction,
} from "@/actions/followups";
import {
  gridCellInputClass,
  gridCellMobileClass,
  gridCellNumberClass,
  gridCellPad,
  gridCellSelectClass,
  gridDataRowClass,
  gridHeaderCellClass,
  gridHeaderRowClass,
  gridTableClass,
  GridSaveIndicator,
  type GridSaveState,
} from "@/components/shared/data-grid";
import { CopyMobileButton } from "@/components/shared/copy-mobile-button";
import { WhatsAppMessageButton } from "@/components/shared/whatsapp-message-button";
import { usePermissions } from "@/components/providers/permissions-provider";
import { Button } from "@/components/ui/button";
import type { FollowupInquiryOption } from "@/features/follow-ups/followup-form";
import { FollowupStatusActions } from "@/features/follow-ups/followup-status-actions";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
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

function displayCustomerName(followup: FollowupWithRelations): string {
  return followup.customers?.name?.trim() || "";
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
  hideOnComplete,
  hideOnReopen,
  onUpdated,
  onRemoved,
}: {
  followup: FollowupWithRelations;
  inquiries: FollowupInquiryOption[];
  canUpdate: boolean;
  hideOnComplete: boolean;
  hideOnReopen: boolean;
  onUpdated: (followup: FollowupWithRelations) => void;
  onRemoved: (id: string) => void;
}) {
  const isCompleted = Boolean(followup.completed_at);
  const [saveState, setSaveState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(followup.followup_date);
  const [customerName, setCustomerName] = useState(() =>
    displayCustomerName(followup),
  );
  const [mobile, setMobile] = useState(() => displayMobile(followup));
  const [notes, setNotes] = useState(followup.notes);
  const [inquiryId, setInquiryId] = useState(followup.inquiry_id ?? "");

  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingFieldRef = useRef<"mobile" | "notes" | "customer_name" | null>(
    null,
  );
  const mobileDirtyRef = useRef(false);
  const notesDirtyRef = useRef(false);
  const nameDirtyRef = useRef(false);

  useEffect(() => {
    if (editingFieldRef.current !== "mobile" && !mobileDirtyRef.current) {
      setMobile(displayMobile(followup));
    }
    if (
      editingFieldRef.current !== "customer_name" &&
      !nameDirtyRef.current
    ) {
      setCustomerName(displayCustomerName(followup));
    }
    if (editingFieldRef.current !== "notes" && !notesDirtyRef.current) {
      setNotes(followup.notes);
    }
    setDate(followup.followup_date);
    setInquiryId(followup.inquiry_id ?? "");
  }, [followup]);

  const saveField = useCallback(
    async (
      field:
        | "followup_date"
        | "notes"
        | "mobile"
        | "customer_name"
        | "inquiry_id",
      value: string,
    ) => {
      if (!canUpdate || isCompleted) return;
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
        if (field === "customer_name") {
          setCustomerName(displayCustomerName(followup));
          nameDirtyRef.current = false;
        }
        if (field === "notes") {
          setNotes(followup.notes);
          notesDirtyRef.current = false;
        }
        if (field === "followup_date") setDate(followup.followup_date);
        if (field === "inquiry_id") setInquiryId(followup.inquiry_id ?? "");
        return;
      }
      if (field === "mobile") mobileDirtyRef.current = false;
      if (field === "customer_name") nameDirtyRef.current = false;
      if (field === "notes") notesDirtyRef.current = false;
      if (result.followup) onUpdated(result.followup);
      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1200);
    },
    [canUpdate, followup, isCompleted, onUpdated],
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
  const editable = canUpdate && !isCompleted;

  return (
    <tr className={gridDataRowClass}>
      <td className={gridCellPad}>
        <input
          type="date"
          className={gridCellNumberClass}
          value={date}
          disabled={!editable}
          onChange={(e) => {
            setDate(e.target.value);
            void saveField("followup_date", e.target.value);
          }}
        />
      </td>
      <td className={gridCellPad}>
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[7rem] font-medium")}
          value={customerName}
          disabled={!editable}
          placeholder="Customer name"
          onFocus={() => {
            editingFieldRef.current = "customer_name";
          }}
          onChange={(e) => {
            nameDirtyRef.current = true;
            setCustomerName(e.target.value);
          }}
          onBlur={() => {
            editingFieldRef.current = null;
            if (customerName.trim() !== displayCustomerName(followup)) {
              void saveField("customer_name", customerName);
            } else {
              nameDirtyRef.current = false;
            }
          }}
        />
      </td>
      <td className={gridCellPad}>
        <div className="flex items-center gap-0.5">
          <CopyMobileButton mobile={mobile} />
          <input
            type="tel"
            inputMode="tel"
            className={cn(gridCellMobileClass, "min-w-0 flex-1")}
            value={mobile}
            disabled={!editable}
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
              if (mobile.trim() && mobile !== displayMobile(followup)) {
                void saveField("mobile", mobile);
              } else {
                mobileDirtyRef.current = false;
              }
            }}
          />
          <WhatsAppMessageButton
            mobile={mobile}
            customerName={customerName || followup.customers?.name || undefined}
            customerId={followup.customer_id}
          />
        </div>
      </td>
      <td className={gridCellPad}>
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[10rem]")}
          value={notes}
          disabled={!editable}
          placeholder="Notes"
          onFocus={() => {
            editingFieldRef.current = "notes";
          }}
          onChange={(e) => {
            notesDirtyRef.current = true;
            setNotes(e.target.value);
          }}
          onBlur={() => {
            editingFieldRef.current = null;
            if (notes !== followup.notes) {
              void saveField("notes", notes);
            } else {
              notesDirtyRef.current = false;
            }
          }}
        />
      </td>
      <td className={gridCellPad}>
        <select
          className={gridCellSelectClass}
          value={inquiryId}
          disabled={!editable}
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
      <td className={gridCellPad}>
        <div className="flex items-center justify-end gap-0.5">
          <GridSaveIndicator state={saveState} error={error} />
          <FollowupStatusActions
            followupId={followup.id}
            completed={isCompleted}
            onCompleted={() => {
              if (hideOnComplete) onRemoved(followup.id);
              else {
                onUpdated({
                  ...followup,
                  completed_at: new Date().toISOString(),
                });
              }
            }}
            onReopened={() => {
              if (hideOnReopen) onRemoved(followup.id);
              else {
                onUpdated({
                  ...followup,
                  completed_at: null,
                });
              }
            }}
          />
          {followup.customer_id ? (
            <Button
              render={<Link href={`/customers/${followup.customer_id}`} />}
              nativeButton={false}
              type="button"
              size="icon-sm"
              variant="ghost"
              className="bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 hover:text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 dark:hover:text-sky-200"
              title="Open 360°"
              aria-label="Open 360°"
            >
              <Eye className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}

export function FollowupsTable({
  followups: initialFollowups,
  inquiries,
  filters,
}: {
  followups: FollowupWithRelations[];
  inquiries: FollowupInquiryOption[];
  filters: Partial<FollowupFilterInput>;
}) {
  const { can } = usePermissions();
  const canUpdate = can("followup.update");
  const statusFilter = filters.status ?? "open";
  const hideOnComplete = statusFilter === "open";
  const hideOnReopen = statusFilter === "completed";

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
    <div className="space-y-1.5">
      {loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load follow-ups: {loadError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-lg border">
        <table className={cn(gridTableClass, "min-w-[980px]")}>
          <thead>
            <tr className={gridHeaderRowClass}>
              <th className={gridHeaderCellClass}>Date</th>
              <th className={gridHeaderCellClass}>Customer</th>
              <th className={gridHeaderCellClass}>Mo No.</th>
              <th className={gridHeaderCellClass}>Notes</th>
              <th className={gridHeaderCellClass}>Inquiry</th>
              <th className={cn(gridHeaderCellClass, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-3.5 animate-spin" />
                    Loading follow-ups…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  No follow-ups match your filters.
                  {statusFilter === "open"
                    ? " Add follow-ups from an inquiry."
                    : statusFilter === "completed"
                      ? " Switch Status to Open to see active follow-ups."
                      : ""}
                </td>
              </tr>
            ) : (
              rows.map((followup) => (
                <FollowupEditableRow
                  key={followup.id}
                  followup={followup}
                  inquiries={inquiries}
                  canUpdate={canUpdate}
                  hideOnComplete={hideOnComplete}
                  hideOnReopen={hideOnReopen}
                  onUpdated={upsertRow}
                  onRemoved={removeRow}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
