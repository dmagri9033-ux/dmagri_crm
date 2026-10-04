"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import {
  createProductGridRowAction,
  deleteProductAction,
  loadProductsGridAction,
  patchProductFieldAction,
} from "@/actions/products";
import {
  formatGridDate,
  GridSaveIndicator,
  gridCellInputClass,
  gridCellSelectClass,
  type GridSaveState,
} from "@/components/shared/data-grid";
import { usePermissions } from "@/components/providers/permissions-provider";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/shared/can";
import type { Product } from "@/lib/db/products";
import type { ProductFilterInput } from "@/validations/product";
import { cn } from "@/lib/utils";

function ProductRow({
  product,
  canUpdate,
  onUpdated,
  onDeleted,
}: {
  product: Product;
  canUpdate: boolean;
  onUpdated: (product: Product) => void;
  onDeleted: (id: string) => void;
}) {
  const [name, setName] = useState(product.name);
  const [active, setActive] = useState(product.is_active);
  const [saveState, setSaveState] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const editingNameRef = useRef(false);
  const dirtyRef = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editingNameRef.current && !dirtyRef.current) setName(product.name);
    setActive(product.is_active);
  }, [product]);

  async function save(field: "name" | "is_active", value: string) {
    if (!canUpdate) return;
    setSaveState("saving");
    setError(undefined);
    const result = await patchProductFieldAction({
      productId: product.id,
      field,
      value,
    });
    if (result.error) {
      setSaveState("error");
      setError(result.error);
      setName(product.name);
      setActive(product.is_active);
      dirtyRef.current = false;
      return;
    }
    dirtyRef.current = false;
    if (result.product) onUpdated(result.product);
    setSaveState("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaveState("idle"), 1200);
  }

  async function remove() {
    if (!window.confirm(`Delete "${product.name}"?`)) return;
    const fd = new FormData();
    fd.set("productId", product.id);
    const result = await deleteProductAction({}, fd);
    if (result.error) {
      setSaveState("error");
      setError(result.error);
      return;
    }
    onDeleted(product.id);
  }

  return (
    <tr className="border-t odd:bg-muted/20">
      <td className="p-1.5">
        <input
          className={cn(gridCellInputClass, "min-w-[12rem] font-medium")}
          value={name}
          disabled={!canUpdate}
          onFocus={() => {
            editingNameRef.current = true;
          }}
          onChange={(e) => {
            dirtyRef.current = true;
            setName(e.target.value);
          }}
          onBlur={() => {
            editingNameRef.current = false;
            if (name.trim() !== product.name) void save("name", name);
            else dirtyRef.current = false;
          }}
        />
      </td>
      <td className="p-1.5">
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
      <td className="p-1.5 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
        {formatGridDate(product.created_at)}
      </td>
      <td className="p-1.5">
        <div className="flex flex-col items-end gap-1">
          <GridSaveIndicator state={saveState} error={error} />
          <Can permission="product.delete">
            <Button type="button" size="sm" variant="destructive" onClick={() => void remove()}>
              Delete
            </Button>
          </Can>
        </div>
      </td>
    </tr>
  );
}

function NewProductRow({
  canCreate,
  onCreated,
}: {
  canCreate: boolean;
  onCreated: (product: Product) => void;
}) {
  const [name, setName] = useState("");
  const [active, setActive] = useState(true);
  const [status, setStatus] = useState<GridSaveState>("idle");
  const [error, setError] = useState<string>();
  const savingRef = useRef(false);

  async function add() {
    if (!canCreate || savingRef.current) return;
    if (name.trim().length < 2) {
      setStatus("error");
      setError("Enter a product name");
      return;
    }
    savingRef.current = true;
    setStatus("saving");
    setError(undefined);
    try {
      const result = await createProductGridRowAction({
        name,
        is_active: active,
      });
      if (result.error) {
        setStatus("error");
        setError(result.error);
        return;
      }
      if (result.product) onCreated(result.product);
      setName("");
      setActive(true);
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
          className={cn(gridCellInputClass, "min-w-[12rem] font-medium")}
          value={name}
          placeholder="Product name *"
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
        <select
          className={gridCellSelectClass}
          value={active ? "true" : "false"}
          onChange={(e) => setActive(e.target.value === "true")}
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </td>
      <td className="p-1.5 text-xs text-muted-foreground">—</td>
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

export function ProductsTable({
  products: initialProducts,
  filters,
}: {
  products: Product[];
  filters: Partial<ProductFilterInput>;
}) {
  const { can } = usePermissions();
  const canUpdate = can("product.update");
  const canCreate = can("product.create");
  const [rows, setRows] = useState(initialProducts);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const filterKey = JSON.stringify(filters);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    const result = await loadProductsGridAction(filters);
    if (result.error) {
      setLoadError(result.error);
      setLoading(false);
      return;
    }
    setRows(result.products ?? []);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    void reload();
  }, [filterKey, reload]);

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" disabled={loading} onClick={() => void reload()}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          Refresh
        </Button>
      </div>
      {loadError ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {loadError}
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="bg-muted/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-2.5 py-2.5 font-semibold">Product</th>
              <th className="px-2.5 py-2.5 font-semibold">Status</th>
              <th className="px-2.5 py-2.5 font-semibold">Created</th>
              <th className="px-2.5 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            <NewProductRow
              canCreate={canCreate}
              onCreated={(product) => {
                setRows((prev) => [...prev, product].sort((a, b) => a.name.localeCompare(b.name)));
              }}
            />
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Loading products…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No products yet. Use the row above to add one.
                </td>
              </tr>
            ) : (
              rows.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  canUpdate={canUpdate}
                  onUpdated={(next) =>
                    setRows((prev) => prev.map((r) => (r.id === next.id ? next : r)))
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
