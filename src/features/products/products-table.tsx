"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createProductGridRowAction,
  deleteProductAction,
  patchProductFieldAction,
} from "@/actions/products";
import { useServerSyncedRows } from "@/hooks/use-server-synced-rows";
import {
  formatGridDate,
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
    <tr className={gridDataRowClass}>
      <td className={gridCellPad}>
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
      <td
        className={cn(
          gridCellPad,
          "tabular-nums text-muted-foreground whitespace-nowrap",
        )}
      >
        {formatGridDate(product.created_at)}
      </td>
      <td className={gridCellPad}>
        <div className="flex items-center justify-end gap-0.5">
          <GridSaveIndicator state={saveState} error={error} />
          <Can permission="product.delete">
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
    <tr className={gridAddRowClass}>
      <td className={gridCellPad}>
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
      <td className={cn(gridCellPad, "text-muted-foreground")}>—</td>
      <td className={gridCellPad}>
        <div className="flex items-center justify-end gap-0.5">
          <GridSaveIndicator state={status} error={error} />
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary dark:bg-primary/20 dark:hover:bg-primary/30"
            onClick={() => void add()}
            title="Add"
            aria-label="Add"
          >
            <Plus className="size-3.5" />
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
  const [rows, setRows] = useServerSyncedRows(initialProducts);
  void filters;

  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto rounded-lg border">
        <table className={cn(gridTableClass, "min-w-[720px]")}>
          <thead>
            <tr className={gridHeaderRowClass}>
              <th className={gridHeaderCellClass}>Product</th>
              <th className={gridHeaderCellClass}>Status</th>
              <th className={gridHeaderCellClass}>Created</th>
              <th className={cn(gridHeaderCellClass, "text-right")}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <NewProductRow
              canCreate={canCreate}
              onCreated={(product) => {
                setRows((prev) =>
                  [...prev, product].sort((a, b) => a.name.localeCompare(b.name)),
                );
              }}
            />
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
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
