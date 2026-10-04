"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Check, Loader2, Plus, RefreshCw } from "lucide-react";
import {
  createInquiryGridRowAction,
  loadInquiriesGridAction,
  patchInquiryFieldAction,
} from "@/actions/inquiries";
import {
  gridCellInputClass,
  gridCellNumberClass,
  gridCellSelectClass,
} from "@/components/shared/data-grid";
import { usePermissions } from "@/components/providers/permissions-provider";
import { Button } from "@/components/ui/button";
import { DeleteInquiryButton } from "@/features/inquiries/delete-inquiry-button";
import { WhatsAppMessageButton } from "@/components/shared/whatsapp-message-button";
import { InquiryStatusActions } from "@/features/inquiries/inquiry-status-actions";
import { CreateFollowupDialog } from "@/features/follow-ups/create-followup-dialog";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { cn } from "@/lib/utils";
import type { Customer } from "@/lib/db/customers";
import type { InquiryWithRelations } from "@/lib/db/inquiries";
import type { Product } from "@/lib/db/products";
import { CUSTOMER_TYPES } from "@/validations/customer";
import type { InquiryFilterInput } from "@/validations/inquiry";

type SaveState = "idle" | "saving" | "saved" | "error";

const cellInputClass = gridCellInputClass;
const cellNumberClass = gridCellNumberClass;
const cellSelectClass = gridCellSelectClass;

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

function displayMobile(inquiry: InquiryWithRelations): string {
  const raw =
    inquiry.mobile_snapshot ||
    inquiry.customers?.mobile ||
    inquiry.customers?.mobile_normalized ||
    "";
  const normalized = normalizeMobile(raw);
  if (normalized && normalized.length === 12 && normalized.startsWith("91")) {
    return normalized.slice(2);
  }
  return raw.replace(/\D/g, "").slice(-10) || raw;
}

function initialCustomerType(inquiry: InquiryWithRelations): string {
  return inquiry.customer_type ?? inquiry.customers?.customer_type ?? "";
}

function SaveIndicator({ state, error }: { state: SaveState; error?: string }) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-[10px] text-destructive" title={error}>
        {error || "Error"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400">
      <Check className="size-3" />
      Saved
    </span>
  );
}

function InquiryEditableRow({
  inquiry,
  customers,
  products,
  canUpdate,
  hideOnComplete,
  hideOnReopen,
  onUpdated,
  onRemoved,
}: {
  inquiry: InquiryWithRelations;
  customers: Customer[];
  products: Product[];
  canUpdate: boolean;
  hideOnComplete: boolean;
  hideOnReopen: boolean;
  onUpdated: (inquiry: InquiryWithRelations) => void;
  onRemoved: (id: string) => void;
}) {
  const isCompleted = Boolean(inquiry.completed_at);
  const editable = canUpdate && !isCompleted;
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState<string>();
  const [mobile, setMobile] = useState(displayMobile(inquiry));
  const [remarks, setRemarks] = useState(inquiry.remarks ?? "");
  const [date, setDate] = useState(inquiry.inquiry_date);
  const [customerType, setCustomerType] = useState(() =>
    initialCustomerType(inquiry),
  );
  const [productId, setProductId] = useState(inquiry.product_id ?? "");
  const [purchased, setPurchased] = useState(inquiry.product_purchased);
  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editingFieldRef = useRef<"mobile" | "remarks" | null>(null);
  const remarksDirtyRef = useRef(false);
  const mobileDirtyRef = useRef(false);

  useEffect(() => {
    if (editingFieldRef.current !== "mobile" && !mobileDirtyRef.current) {
      setMobile(displayMobile(inquiry));
    }
    if (editingFieldRef.current !== "remarks" && !remarksDirtyRef.current) {
      setRemarks(inquiry.remarks ?? "");
    }
    setDate(inquiry.inquiry_date);
    setCustomerType(initialCustomerType(inquiry));
    setProductId(inquiry.product_id ?? "");
    setPurchased(inquiry.product_purchased);
  }, [inquiry]);

  const saveField = useCallback(
    async (
      field:
        | "inquiry_date"
        | "mobile"
        | "customer_type"
        | "product_id"
        | "product_purchased"
        | "remarks",
      value: string,
    ) => {
      if (!editable) return;
      setSaveState("saving");
      setError(undefined);
      const result = await patchInquiryFieldAction({
        inquiryId: inquiry.id,
        field,
        value,
      });
      if (result.error) {
        setSaveState("error");
        setError(result.error);
        if (field === "mobile") {
          setMobile(displayMobile(inquiry));
          mobileDirtyRef.current = false;
        }
        if (field === "remarks") {
          setRemarks(inquiry.remarks ?? "");
          remarksDirtyRef.current = false;
        }
        return;
      }
      if (field === "mobile") mobileDirtyRef.current = false;
      if (field === "remarks") remarksDirtyRef.current = false;
      if (result.inquiry) {
        onUpdated(result.inquiry);
      }
      setSaveState("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1200);
    },
    [editable, inquiry, onUpdated],
  );

  function scheduleMobileSave(value: string) {
    if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
    mobileDebounceRef.current = setTimeout(() => {
      void saveField("mobile", value);
    }, 700);
  }

  const productOptions = products.slice();
  if (
    inquiry.products &&
    !productOptions.some((p) => p.id === inquiry.products?.id)
  ) {
    productOptions.unshift({
      id: inquiry.products.id,
      name: inquiry.products.name,
      is_active: inquiry.products.is_active,
      created_at: inquiry.created_at,
      updated_at: inquiry.updated_at,
      deleted_at: null,
    });
  } else if (
    inquiry.product_id &&
    !productOptions.some((p) => p.id === inquiry.product_id)
  ) {
    productOptions.unshift({
      id: inquiry.product_id,
      name: inquiry.product_name_snapshot || "Product",
      is_active: true,
      created_at: inquiry.created_at,
      updated_at: inquiry.updated_at,
      deleted_at: null,
    });
  }

  return (
    <tr className="border-t odd:bg-muted/20">
      <td className="p-1.5">
        <input
          type="date"
          className={cellNumberClass}
          value={date}
          disabled={!editable}
          onChange={(e) => {
            setDate(e.target.value);
            void saveField("inquiry_date", e.target.value);
          }}
        />
      </td>
      <td className="p-1.5">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <input
              type="tel"
              inputMode="tel"
              className={cn(cellNumberClass, "min-w-0 flex-1")}
              value={mobile}
              disabled={!editable}
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
                if (mobile.trim() && mobile !== displayMobile(inquiry)) {
                  void saveField("mobile", mobile);
                } else {
                  mobileDirtyRef.current = false;
                }
              }}
            />
            <WhatsAppMessageButton
              mobile={mobile}
              customerName={
                inquiry.customers?.name ||
                inquiry.customer_name_snapshot ||
                undefined
              }
              customerId={inquiry.customer_id}
              inquiryId={inquiry.id}
            />
          </div>
          {inquiry.customer_id ? (
            <Link
              href={`/customers/${inquiry.customer_id}`}
              className="px-2 text-[10px] text-muted-foreground underline-offset-2 hover:underline"
            >
              Open 360°
            </Link>
          ) : null}
        </div>
      </td>
      <td className="p-1.5">
        <select
          className={cellSelectClass}
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
      <td className="p-1.5">
        <select
          className={cellSelectClass}
          value={productId}
          disabled={!editable}
          onChange={(e) => {
            setProductId(e.target.value);
            if (!e.target.value) setPurchased(false);
            void saveField("product_id", e.target.value);
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
      <td className="p-1.5">
        <select
          className={cn(
            cellSelectClass,
            purchased
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "bg-muted/40",
          )}
          value={purchased ? "true" : "false"}
          disabled={!editable || !productId}
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
      <td className="p-1.5">
        <input
          type="text"
          className={cn(cellInputClass, "min-w-[10rem]")}
          value={remarks}
          disabled={!editable}
          placeholder="Notes"
          autoComplete="off"
          spellCheck={false}
          onFocus={() => {
            editingFieldRef.current = "remarks";
          }}
          onChange={(e) => {
            remarksDirtyRef.current = true;
            setRemarks(e.target.value);
          }}
          onKeyDown={(e) => {
            // Keep typing fluid — don't let Enter submit surrounding forms
            if (e.key === "Enter") e.stopPropagation();
          }}
          onBlur={() => {
            editingFieldRef.current = null;
            const next = remarks;
            const prev = inquiry.remarks ?? "";
            if (next !== prev) {
              void saveField("remarks", next);
            } else {
              remarksDirtyRef.current = false;
            }
          }}
        />
      </td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <SaveIndicator state={saveState} error={error} />
          <div className="flex flex-wrap justify-end gap-1">
            <InquiryStatusActions
              inquiryId={inquiry.id}
              completed={isCompleted}
              onCompleted={() => {
                if (hideOnComplete) onRemoved(inquiry.id);
              }}
              onReopened={() => {
                if (hideOnReopen) onRemoved(inquiry.id);
              }}
            />
            {!isCompleted ? (
              <CreateFollowupDialog
                customers={customers}
                inquiries={[
                  {
                    id: inquiry.id,
                    inquiry_date: inquiry.inquiry_date,
                    product_name_snapshot:
                      inquiry.product_name_snapshot ||
                      inquiry.products?.name ||
                      null,
                    customer_id: inquiry.customer_id,
                  },
                ]}
                defaultCustomerId={inquiry.customer_id}
                defaultInquiryId={inquiry.id}
                triggerLabel="Follow-up"
                triggerVariant="ghost"
                triggerSize="sm"
                triggerClassName="bg-violet-500/10 text-violet-800 hover:bg-violet-500/20 hover:text-violet-900 dark:bg-violet-500/20 dark:text-violet-300 dark:hover:bg-violet-500/30 dark:hover:text-violet-200"
              />
            ) : null}
            <DeleteInquiryButton
              inquiryId={inquiry.id}
              label={mobile || "this inquiry"}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

function NewInquiryRow({
  products,
  canCreate,
  onCreated,
}: {
  products: Product[];
  canCreate: boolean;
  onCreated: (inquiry: InquiryWithRelations) => void;
}) {
  const [pending, startTransition] = useTransition();
  const savingRef = useRef(false);
  const [date, setDate] = useState(todayIst());
  const [mobile, setMobile] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [productId, setProductId] = useState("");
  const [purchased, setPurchased] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState<string>();
  const [status, setStatus] = useState<SaveState>("idle");

  function reset() {
    setDate(todayIst());
    setMobile("");
    setCustomerType("");
    setProductId("");
    setPurchased(false);
    setRemarks("");
  }

  async function saveNewRow() {
    if (!canCreate || savingRef.current) return;
    const trimmed = mobile.trim();
    if (!trimmed) return;

    const normalized = normalizeMobile(trimmed);
    if (!normalized) {
      setError("Enter a valid mobile number to add a row");
      setStatus("error");
      return;
    }

    savingRef.current = true;
    setStatus("saving");
    setError(undefined);
    try {
      const result = await createInquiryGridRowAction({
        mobile: trimmed,
        inquiry_date: date,
        customer_type: customerType,
        product_id: productId,
        product_purchased: purchased,
        remarks,
      });

      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }

      setStatus("saved");
      reset();
      if (result.inquiry) {
        startTransition(() => onCreated(result.inquiry!));
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
          type="date"
          className={cellNumberClass}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </td>
      <td className="p-1.5">
        <input
          type="tel"
          inputMode="tel"
          className={cellNumberClass}
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
        <select
          className={cellSelectClass}
          value={customerType}
          onChange={(e) => setCustomerType(e.target.value)}
        >
          <option value="">—</option>
          {CUSTOMER_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </td>
      <td className="p-1.5">
        <select
          className={cellSelectClass}
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            if (!e.target.value) setPurchased(false);
          }}
        >
          <option value="">—</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </td>
      <td className="p-1.5">
        <select
          className={cellSelectClass}
          value={purchased ? "true" : "false"}
          disabled={!productId}
          onChange={(e) => setPurchased(e.target.value === "true")}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>
      <td className="p-1.5">
        <input
          type="text"
          className={cn(cellInputClass, "min-w-[8rem]")}
          value={remarks}
          placeholder="Notes"
          onChange={(e) => setRemarks(e.target.value)}
        />
      </td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <SaveIndicator state={pending ? "saving" : status} error={error} />
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

export function InquiriesTable({
  inquiries: initialInquiries,
  customers,
  products: initialProducts,
  filters,
}: {
  inquiries: InquiryWithRelations[];
  customers: Customer[];
  products: Product[];
  filters: Partial<InquiryFilterInput>;
}) {
  const { can } = usePermissions();
  const canUpdate = can("inquiry.update");
  const canCreate = can("inquiry.create");
  const statusFilter = filters.status ?? "open";
  const hideOnComplete = statusFilter === "open";
  const hideOnReopen = statusFilter === "completed";

  const [rows, setRows] = useState(initialInquiries);
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();

  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    const result = await loadInquiriesGridAction(filters);
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }
    setRows(result.inquiries ?? []);
    if (result.products?.length) setProducts(result.products);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [filterKey, reload]);

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function upsertRow(inquiry: InquiryWithRelations) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === inquiry.id);
      if (idx === -1) return [inquiry, ...prev];
      const next = [...prev];
      next[idx] = inquiry;
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
          Failed to load inquiries: {loadError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2.5 py-2.5 font-semibold">Date</th>
              <th className="px-2.5 py-2.5 font-semibold">Mo No.</th>
              <th className="px-2.5 py-2.5 font-semibold">Type</th>
              <th className="px-2.5 py-2.5 font-semibold">Product</th>
              <th className="px-2.5 py-2.5 font-semibold">Purchased</th>
              <th className="px-2.5 py-2.5 font-semibold">Notes</th>
              <th className="px-2.5 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {statusFilter !== "completed" ? (
              <NewInquiryRow
                products={products}
                canCreate={canCreate}
                onCreated={(inquiry) => {
                  upsertRow(inquiry);
                }}
              />
            ) : null}
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading inquiries…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No inquiries match your filters.
                  {statusFilter === "open"
                    ? " Use the row above to add one."
                    : statusFilter === "completed"
                      ? " Switch Status to Open to see active inquiries."
                      : " Use the row above to add one."}
                </td>
              </tr>
            ) : (
              rows.map((inquiry) => (
                <InquiryEditableRow
                  key={inquiry.id}
                  inquiry={inquiry}
                  customers={customers}
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
