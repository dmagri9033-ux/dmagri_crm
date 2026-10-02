"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Customer } from "@/lib/db/customers";
import type { ProfileLite } from "@/lib/db/reminders";

export function ReminderFilters({
  search,
  status,
  assignedUserId,
  customerId,
  dateFrom,
  dateTo,
  customers,
  assignees,
}: {
  search: string;
  status: string;
  assignedUserId: string;
  customerId: string;
  dateFrom: string;
  dateTo: string;
  customers: Customer[];
  assignees: ProfileLite[];
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
    // Keep default "open" out of URL only when clearing to all via Clear
    params.delete("page");
    startTransition(() => {
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }

  return (
    <form
      className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        pushParams({
          search: String(form.get("search") || ""),
          status: String(form.get("status") || "open"),
          assignedUserId: String(form.get("assignedUserId") || ""),
          customerId: String(form.get("customerId") || ""),
          dateFrom: String(form.get("dateFrom") || ""),
          dateTo: String(form.get("dateTo") || ""),
        });
      }}
    >
      <div className="space-y-2 lg:col-span-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          name="search"
          defaultValue={search}
          placeholder="Title, notes, customer, mobile…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Status (IST)</Label>
        <select
          id="status"
          name="status"
          defaultValue={status}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="open">Open</option>
          <option value="overdue">Overdue</option>
          <option value="today">Today</option>
          <option value="upcoming">Upcoming</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="assignedUserId">Assignee</Label>
        <select
          id="assignedUserId"
          name="assignedUserId"
          defaultValue={assignedUserId}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">All assignees</option>
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.display_name}
            </option>
          ))}
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
  );
}
