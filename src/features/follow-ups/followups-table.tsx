"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Eye } from "lucide-react";
import { patchFollowupFieldAction } from "@/actions/followups";
import { useServerSyncedRows } from "@/hooks/use-server-synced-rows";
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
import type { Product } from "@/lib/db/products";
import type { FollowupFilterInput } from "@/validations/followup";
import { CUSTOMER_TYPES } from "@/validations/customer";
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

function initialCustomerType(followup: FollowupWithRelations): string {
  return (
    followup.customers?.customer_type ??
    followup.inquiries?.customer_type ??
    ""
  );
}

function FollowupEditableRow({
  followup,
  products,
  canUpdate,
  hideOnComplete,
  hideOnReopen,
  onUpdated,
  onRemoved,
}: {
  followup: FollowupWithRelations;
  products: Product[];
  canUpdate: boolean;
  hideOnComplete: boolean;
  hideOnReopen: boolean;
  onUpdated: (followup: FollowupWithRelations) => void;
  onRemoved: (id: string) => void;
}) {
  const isCompleted = Boolean(followup.completed_at);
  const hasInquiry = Boolean(followup.inquiry_id);
  const [saveState, setSaveState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const [date, setDate] = useState(followup.followup_date);
  const [customerName, setCustomerName] = useState(() =>
    displayCustomerName(followup),
  );
  const [mobile, setMobile] = useState(() => displayMobile(followup));
  const [customerType, setCustomerType] = useState(() =>
    initialCustomerType(followup),
  );
  const [productId, setProductId] = useState(
    followup.inquiries?.product_id ?? "",
  );
  const [purchased, setPurchased] = useState(
    Boolean(followup.inquiries?.product_purchased),
  );
  const [notes, setNotes] = useState(followup.notes);

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
    setCustomerType(initialCustomerType(followup));
    setProductId(followup.inquiries?.product_id ?? "");
    setPurchased(Boolean(followup.inquiries?.product_purchased));
  }, [followup]);

  const saveField = useCallback(
    async (
      field:
        | "followup_date"
        | "notes"
        | "mobile"
        | "customer_name"
        | "customer_type"
        | "product_id"
        | "product_purchased",
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
        if (field === "customer_type") {
          setCustomerType(initialCustomerType(followup));
        }
        if (field === "product_id") {
          setProductId(followup.inquiries?.product_id ?? "");
        }
        if (field === "product_purchased") {
          setPurchased(Boolean(followup.inquiries?.product_purchased));
        }
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

  const editable = canUpdate && !isCompleted;

  const productOptions = products.slice();
  const linkedProductId = followup.inquiries?.product_id;
  const linkedProductName = followup.inquiries?.product_name_snapshot;
  if (
    linkedProductId &&
    !productOptions.some((p) => p.id === linkedProductId)
  ) {
    productOptions.unshift({
      id: linkedProductId,
      name: linkedProductName || "Product",
      is_active: true,
      created_at: followup.created_at,
      updated_at: followup.updated_at,
      deleted_at: null,
    });
  }

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
            inquiryId={followup.inquiry_id ?? undefined}
          />
        </div>
      </td>
      <td className={gridCellPad}>
        <select
          className={gridCellSelectClass}
          value={customerType}
          disabled={!editable}
          onChange={(e) => {
            setCustomerType(e.target.value);
            void saveField("customer_type", e.target.value);
          }}
        >
          <option value="">—</option>
          {CUSTOMER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </td>
      <td className={gridCellPad}>
        <select
          className={gridCellSelectClass}
          value={productId}
          disabled={!editable || !hasInquiry}
          title={
            hasInquiry
              ? undefined
              : "Follow-up must be linked to an inquiry to set product"
          }
          onChange={(e) => {
            const next = e.target.value;
            setProductId(next);
            if (!next) setPurchased(false);
            void saveField("product_id", next);
          }}
        >
          <option value="">—</option>
          {productOptions.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
              {!product.is_active ? " (inactive)" : ""}
            </option>
          ))}
        </select>
      </td>
      <td className={gridCellPad}>
        <select
          className={cn(
            gridCellSelectClass,
            purchased
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "bg-muted/40",
          )}
          value={purchased ? "true" : "false"}
          disabled={!editable || !hasInquiry || !productId}
          onChange={(e) => {
            const next = e.target.value === "true";
            setPurchased(next);
            void saveField("product_purchased", next ? "true" : "false");
          }}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>
      <td className={gridCellPad}>
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[7rem]")}
          value={notes}
          disabled={!editable}
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
  products,
  filters,
}: {
  followups: FollowupWithRelations[];
  products: Product[];
  inquiries?: FollowupInquiryOption[];
  filters: Partial<FollowupFilterInput>;
}) {
  const { can } = usePermissions();
  const canUpdate = can("followup.update");
  const statusFilter = filters.status ?? "open";
  const hideOnComplete = statusFilter === "open";
  const hideOnReopen = statusFilter === "completed";

  const [rows, setRows] = useServerSyncedRows(initialFollowups);

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
      <div className="overflow-x-auto rounded-lg border">
        <table className={cn(gridTableClass, "min-w-[1100px]")}>
          <thead>
            <tr className={gridHeaderRowClass}>
              <th className={gridHeaderCellClass}>Date</th>
              <th className={gridHeaderCellClass}>Customer</th>
              <th className={gridHeaderCellClass}>Mo No.</th>
              <th className={gridHeaderCellClass}>Type</th>
              <th className={gridHeaderCellClass}>Product</th>
              <th className={gridHeaderCellClass}>Purchased</th>
              <th className={gridHeaderCellClass}>Notes</th>
              <th className={cn(gridHeaderCellClass, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
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
                  products={products}
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
