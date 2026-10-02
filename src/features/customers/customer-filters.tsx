"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CollapsibleFilters } from "@/components/shared/collapsible-filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/db/products";
import { CUSTOMER_TYPES } from "@/validations/customer";

export function CustomerFilters({
  search,
  productId,
  customerType,
  purchased,
  followUp,
  products,
  heading,
  actions,
}: {
  search: string;
  productId: string;
  customerType: string;
  purchased: "all" | "yes" | "no";
  followUp: "all" | "yes" | "no";
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
    (productId ? 1 : 0) +
    (customerType && customerType !== "all" ? 1 : 0) +
    (purchased !== "all" ? 1 : 0) +
    (followUp !== "all" ? 1 : 0);

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
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
        key={`${search}|${productId}|${customerType}|${purchased}|${followUp}`}
        className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-3 lg:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          pushParams({
            search: String(form.get("search") || ""),
            productId: String(form.get("productId") || ""),
            customerType: String(form.get("customerType") || "all"),
            purchased: String(form.get("purchased") || "all"),
            followUp: String(form.get("followUp") || "all"),
          });
        }}
      >
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            name="search"
            defaultValue={search}
            placeholder="Name or mobile…"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customerType">Customer type</Label>
          <select
            id="customerType"
            name="customerType"
            defaultValue={customerType}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="all">All types</option>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="productId">Product</Label>
          <select
            id="productId"
            name="productId"
            defaultValue={productId}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">All products</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="purchased">Purchased</Label>
          <select
            id="purchased"
            name="purchased"
            defaultValue={purchased}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="all">All</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="followUp">Follow-up</Label>
          <select
            id="followUp"
            name="followUp"
            defaultValue={followUp}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="all">All</option>
            <option value="yes">Required</option>
            <option value="no">Not required</option>
          </select>
        </div>

        <div className="flex gap-2 lg:col-span-3">
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
