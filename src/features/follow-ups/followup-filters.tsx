"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { CollapsibleFilters } from "@/components/shared/collapsible-filters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Customer } from "@/lib/db/customers";
import { CUSTOMER_TYPES } from "@/validations/customer";

export function FollowupFilters({
  search,
  dateFrom,
  dateTo,
  customerId,
  customerType,
  linked,
  customers,
  heading,
  actions,
}: {
  search: string;
  dateFrom: string;
  dateTo: string;
  customerId: string;
  customerType: string;
  linked: "all" | "yes" | "no";
  customers: Customer[];
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
    (customerId ? 1 : 0) +
    (customerType && customerType !== "all" ? 1 : 0) +
    (linked !== "all" ? 1 : 0);

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
        key={`${search}|${dateFrom}|${dateTo}|${customerId}|${customerType}|${linked}`}
        className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          pushParams({
            search: String(form.get("search") || ""),
            dateFrom: String(form.get("dateFrom") || ""),
            dateTo: String(form.get("dateTo") || ""),
            customerId: String(form.get("customerId") || ""),
            customerType: String(form.get("customerType") || "all"),
            linked: String(form.get("linked") || "all"),
          });
        }}
      >
        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            name="search"
            defaultValue={search}
            placeholder="Notes, customer name, or mobile…"
          />
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
        <div className="space-y-2">
          <Label htmlFor="linked">Inquiry link</Label>
          <select
            id="linked"
            name="linked"
            defaultValue={linked}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="all">All</option>
            <option value="yes">Linked to inquiry</option>
            <option value="no">Not linked</option>
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
        <div className="space-y-2 lg:col-span-3">
          <Label htmlFor="customerId">Customer</Label>
          <select
            id="customerId"
            name="customerId"
            defaultValue={customerId}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">All customers</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} · {customer.mobile}
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
