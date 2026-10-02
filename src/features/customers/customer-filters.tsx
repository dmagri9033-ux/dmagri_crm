"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Product } from "@/lib/db/products";

export function CustomerFilters({
  search,
  productId,
  purchased,
  followUp,
  products,
}: {
  search: string;
  productId: string;
  purchased: "all" | "yes" | "no";
  followUp: "all" | "yes" | "no";
  products: Product[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

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
    <form
      className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-5 lg:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        pushParams({
          search: String(form.get("search") || ""),
          productId: String(form.get("productId") || ""),
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

      <div className="flex gap-2 lg:col-span-5">
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
  );
}
