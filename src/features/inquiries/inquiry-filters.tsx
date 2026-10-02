"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CollapsibleFilters } from "@/components/shared/collapsible-filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/db/products";
import { CUSTOMER_TYPES } from "@/validations/customer";

export function InquiryFilters({
  search,
  dateFrom,
  dateTo,
  customerType,
  productId,
  purchased,
  status,
  products,
  heading,
  actions,
}: {
  search: string;
  dateFrom: string;
  dateTo: string;
  customerType: string;
  productId: string;
  purchased: "all" | "yes" | "no";
  status: "open" | "completed" | "all";
  products: Product[];
  heading?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeCount =
    (search.trim() ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0) +
    (customerType && customerType !== "all" ? 1 : 0) +
    (productId ? 1 : 0) +
    (purchased !== "all" ? 1 : 0) +
    (status !== "open" ? 1 : 0);

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (
        !value ||
        value === "all" ||
        (key === "status" && value === "open")
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    params.delete("page");
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <CollapsibleFilters
      activeCount={activeCount}
      heading={heading}
      actions={actions}
    >
      <form
        key={`${search}|${dateFrom}|${dateTo}|${customerType}|${productId}|${purchased}|${status}`}
        className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          pushParams({
            search: String(form.get("search") || ""),
            dateFrom: String(form.get("dateFrom") || ""),
            dateTo: String(form.get("dateTo") || ""),
            customerType: String(form.get("customerType") || "all"),
            productId: String(form.get("productId") || ""),
            purchased: String(form.get("purchased") || "all"),
            status: String(form.get("status") || "open"),
          });
        }}
      >
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            name="search"
            defaultValue={search}
            placeholder="Customer, mobile, product, remarks…"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="open">Open</option>
            <option value="completed">Completed</option>
            <option value="all">All</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchased">Purchased</Label>
          <select
            id="purchased"
            name="purchased"
            defaultValue={purchased}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateFrom">From date</Label>
          <Input id="dateFrom" name="dateFrom" type="date" defaultValue={dateFrom} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dateTo">To date</Label>
          <Input id="dateTo" name="dateTo" type="date" defaultValue={dateTo} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customerType">Customer type</Label>
          <select
            id="customerType"
            name="customerType"
            defaultValue={customerType}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="all">All types</option>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="productId">Product</Label>
          <select
            id="productId"
            name="productId"
            defaultValue={productId}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2 lg:col-span-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Filtering…" : "Apply"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => router.push(pathname))}
          >
            Clear
          </Button>
        </div>
      </form>
    </CollapsibleFilters>
  );
}
