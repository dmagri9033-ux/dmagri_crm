"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import {
  createCustomerGridRowAction,
  loadCustomersGridAction,
  patchCustomerFieldAction,
} from "@/actions/customers";
import {
  GridSaveIndicator,
  gridCellInputClass,
  gridCellSelectClass,
  type GridSaveState,
} from "@/components/shared/data-grid";
import { usePermissions } from "@/components/providers/permissions-provider";
import { Button } from "@/components/ui/button";
import { WhatsAppMessageButton } from "@/components/shared/whatsapp-message-button";
import { DeleteCustomerButton } from "@/features/customers/delete-customer-button";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import type { CustomerWithProduct } from "@/lib/db/customers";
import type { Product } from "@/lib/db/products";
import { cn } from "@/lib/utils";
import { CUSTOMER_TYPES, type CustomerFilterInput } from "@/validations/customer";

function displayMobile(customer: CustomerWithProduct): string {
  const raw = customer.mobile_normalized || customer.mobile || "";
  const normalized = normalizeMobile(raw);
  if (normalized && normalized.length === 12 && normalized.startsWith("91")) {
    return normalized.slice(2);
  }
  return customer.mobile.replace(/\D/g, "").slice(-10) || customer.mobile;
}

function productOptionsForRow(
  customer: CustomerWithProduct,
  products: Product[],
): Product[] {
  const options = products.slice();
  if (
    customer.products &&
    !options.some((p) => p.id === customer.products?.id)
  ) {
    options.unshift({
      id: customer.products.id,
      name: customer.products.name,
      is_active: customer.products.is_active,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      deleted_at: null,
    });
  } else if (
    customer.primary_product_id &&
    !options.some((p) => p.id === customer.primary_product_id)
  ) {
    options.unshift({
      id: customer.primary_product_id,
      name: "Product",
      is_active: true,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      deleted_at: null,
    });
  }
  return options;
}

function CustomerEditableRow({
  customer,
  products,
  canUpdate,
  onUpdated,
}: {
  customer: CustomerWithProduct;
  products: Product[];
  canUpdate: boolean;
  onUpdated: (customer: CustomerWithProduct) => void;
}) {
  const [saveState, setSaveState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const [name, setName] = useState(customer.name);
  const [mobile, setMobile] = useState(() => displayMobile(customer));
  const [customerType, setCustomerType] = useState(customer.customer_type ?? "");
  const [productId, setProductId] = useState(customer.primary_product_id ?? "");
  const [purchased, setPurchased] = useState(customer.product_purchased);
  const [followUp, setFollowUp] = useState(customer.follow_up_required);

  const editingNameRef = useRef(false);
  const editingMobileRef = useRef(false);
  const nameDirtyRef = useRef(false);
  const mobileDirtyRef = useRef(false);
  const mobileDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editingNameRef.current && !nameDirtyRef.current) {
      setName(customer.name);
    }
    if (!editingMobileRef.current && !mobileDirtyRef.current) {
      setMobile(displayMobile(customer));
    }
    setCustomerType(customer.customer_type ?? "");
    setProductId(customer.primary_product_id ?? "");
    setPurchased(customer.product_purchased);
    setFollowUp(customer.follow_up_required);
  }, [customer]);

  async function saveField(
    field:
      | "name"
      | "mobile"
      | "customer_type"
      | "primary_product_id"
      | "product_purchased"
      | "follow_up_required",
    value: string,
  ) {
    if (!canUpdate) return;
    setSaveState("saving");
    setError(undefined);
    const result = await patchCustomerFieldAction({
      customerId: customer.id,
      field,
      value,
    });
    if (result.error) {
      setSaveState("error");
      setError(result.error);
      if (field === "name") {
        setName(customer.name);
        nameDirtyRef.current = false;
      }
      if (field === "mobile") {
        setMobile(displayMobile(customer));
        mobileDirtyRef.current = false;
      }
      if (field === "primary_product_id") {
        setProductId(customer.primary_product_id ?? "");
        setPurchased(customer.product_purchased);
      }
      if (field === "product_purchased") {
        setPurchased(customer.product_purchased);
      }
      return;
    }
    if (field === "name") nameDirtyRef.current = false;
    if (field === "mobile") mobileDirtyRef.current = false;
    if (result.customer) onUpdated(result.customer);
    setSaveState("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1200);
  }

  function scheduleMobileSave(value: string) {
    if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
    mobileDebounceRef.current = setTimeout(() => {
      void saveField("mobile", value);
    }, 700);
  }

  const productOptions = productOptionsForRow(customer, products);

  return (
    <tr className="border-t odd:bg-muted/20">
      <td className="p-1.5">
        <input
          type="text"
          className={cn(gridCellInputClass, "min-w-[10rem] font-medium")}
          value={name}
          disabled={!canUpdate}
          onFocus={() => {
            editingNameRef.current = true;
          }}
          onChange={(e) => {
            nameDirtyRef.current = true;
            setName(e.target.value);
          }}
          onBlur={() => {
            editingNameRef.current = false;
            if (name.trim() !== customer.name) void saveField("name", name);
            else nameDirtyRef.current = false;
          }}
        />
      </td>
      <td className="p-1.5">
        <div className="flex items-center gap-1">
          <input
            type="tel"
            inputMode="tel"
            className={cn(gridCellInputClass, "min-w-0 flex-1 tabular-nums")}
            value={mobile}
            disabled={!canUpdate}
            placeholder="Mobile"
            onFocus={() => {
              editingMobileRef.current = true;
            }}
            onChange={(e) => {
              mobileDirtyRef.current = true;
              setMobile(e.target.value);
              scheduleMobileSave(e.target.value);
            }}
            onBlur={() => {
              editingMobileRef.current = false;
              if (mobileDebounceRef.current) clearTimeout(mobileDebounceRef.current);
              if (mobile.trim() && mobile !== displayMobile(customer)) {
                void saveField("mobile", mobile);
              } else {
                mobileDirtyRef.current = false;
              }
            }}
          />
          <WhatsAppMessageButton
            mobile={mobile}
            customerName={customer.name}
            customerId={customer.id}
          />
        </div>
      </td>
      <td className="p-1.5">
        <select
          className={gridCellSelectClass}
          value={customerType}
          disabled={!canUpdate}
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
          className={gridCellSelectClass}
          value={productId}
          disabled={!canUpdate}
          onChange={(e) => {
            setProductId(e.target.value);
            if (!e.target.value) setPurchased(false);
            void saveField("primary_product_id", e.target.value);
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
            gridCellSelectClass,
            purchased
              ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
              : "bg-muted/40",
          )}
          value={purchased ? "true" : "false"}
          disabled={!canUpdate || !productId}
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
        <select
          className={cn(
            gridCellSelectClass,
            followUp
              ? "bg-amber-500/10 text-amber-900 dark:text-amber-200"
              : "bg-muted/40",
          )}
          value={followUp ? "true" : "false"}
          disabled={!canUpdate}
          onChange={(e) => {
            const next = e.target.value === "true";
            setFollowUp(next);
            void saveField("follow_up_required", next ? "true" : "false");
          }}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <GridSaveIndicator state={saveState} error={error} />
          <div className="flex flex-wrap justify-end gap-1">
            <Button
              render={<Link href={`/customers/${customer.id}`} />}
              nativeButton={false}
              type="button"
              size="sm"
              variant="ghost"
              className="bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 hover:text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 dark:hover:bg-sky-500/30 dark:hover:text-sky-200"
            >
              Open 360°
            </Button>
            <DeleteCustomerButton
              customerId={customer.id}
              customerName={customer.name}
            />
          </div>
        </div>
      </td>
    </tr>
  );
}

function NewCustomerRow({
  products,
  canCreate,
  onCreated,
}: {
  products: Product[];
  canCreate: boolean;
  onCreated: (customer: CustomerWithProduct) => void;
}) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [customerType, setCustomerType] = useState("");
  const [productId, setProductId] = useState("");
  const [purchased, setPurchased] = useState(false);
  const [followUp, setFollowUp] = useState(false);
  const [status, setStatus] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const savingRef = useRef(false);

  async function add() {
    if (!canCreate || savingRef.current) return;
    const trimmed = mobile.trim();
    if (!trimmed) {
      setStatus("error");
      setError("Enter a mobile number");
      return;
    }
    if (!normalizeMobile(trimmed)) {
      setStatus("error");
      setError("Enter a valid mobile number");
      return;
    }

    savingRef.current = true;
    setStatus("saving");
    setError(undefined);
    try {
      const result = await createCustomerGridRowAction({
        name: name.trim() || undefined,
        mobile: trimmed,
        customer_type: customerType,
        primary_product_id: productId,
        product_purchased: purchased,
        follow_up_required: followUp,
      });
      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }
      if (result.customer) onCreated(result.customer);
      setName("");
      setMobile("");
      setCustomerType("");
      setProductId("");
      setPurchased(false);
      setFollowUp(false);
      setStatus("saved");
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
          className={cn(gridCellInputClass, "min-w-[10rem] font-medium")}
          value={name}
          placeholder="Name (optional)"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
        />
      </td>
      <td className="p-1.5">
        <input
          type="tel"
          inputMode="tel"
          className={cn(gridCellInputClass, "tabular-nums font-medium")}
          value={mobile}
          placeholder="Mobile number *"
          onChange={(e) => setMobile(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void add();
            }
          }}
        />
      </td>
      <td className="p-1.5">
        <select
          className={gridCellSelectClass}
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
          className={gridCellSelectClass}
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
          className={gridCellSelectClass}
          value={purchased ? "true" : "false"}
          disabled={!productId}
          onChange={(e) => setPurchased(e.target.value === "true")}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>
      <td className="p-1.5">
        <select
          className={gridCellSelectClass}
          value={followUp ? "true" : "false"}
          onChange={(e) => setFollowUp(e.target.value === "true")}
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      </td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <GridSaveIndicator state={status} error={error} />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/30"
            onClick={() => void add()}
          >
            <Plus className="size-3.5" />
            Add
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function CustomersTable({
  customers: initialCustomers,
  products,
  filters,
}: {
  customers: CustomerWithProduct[];
  products: Product[];
  filters: Partial<CustomerFilterInput>;
}) {
  const { can } = usePermissions();
  const canUpdate = can("customer.update");
  const canCreate = can("customer.create");

  const [rows, setRows] = useState(initialCustomers);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    const result = await loadCustomersGridAction(filters);
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }
    setRows(result.customers ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [filterKey, reload]);

  function upsertRow(customer: CustomerWithProduct) {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.id === customer.id);
      if (idx === -1) return [customer, ...prev];
      const next = [...prev];
      next[idx] = customer;
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
          Failed to load customers: {loadError}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[960px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2.5 py-2.5 font-semibold">Name</th>
              <th className="px-2.5 py-2.5 font-semibold">Mo No.</th>
              <th className="px-2.5 py-2.5 font-semibold">Type</th>
              <th className="px-2.5 py-2.5 font-semibold">Product</th>
              <th className="px-2.5 py-2.5 font-semibold">Purchased</th>
              <th className="px-2.5 py-2.5 font-semibold">Follow-up</th>
              <th className="px-2.5 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <NewCustomerRow
              products={products}
              canCreate={canCreate}
              onCreated={(customer) => {
                upsertRow(customer);
              }}
            />
            {loading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Loading customers…
                  </span>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No customers match your filters. Use the row above to add one.
                </td>
              </tr>
            ) : (
              rows.map((customer) => (
                <CustomerEditableRow
                  key={customer.id}
                  customer={customer}
                  products={products}
                  canUpdate={canUpdate}
                  onUpdated={upsertRow}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
