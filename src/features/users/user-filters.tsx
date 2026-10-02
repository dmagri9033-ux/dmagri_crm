"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { UserRoleLite } from "@/lib/db/users";

export function UserFilters({
  search,
  status,
  roleId,
  roles,
}: {
  search: string;
  status: "all" | "active" | "inactive";
  roleId: string;
  roles: UserRoleLite[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function updateParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (
        !value ||
        value === "all" ||
        (key === "search" && !value.trim()) ||
        (key === "role_id" && !value)
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
    <form
      className="flex flex-col gap-3 rounded-xl border bg-card p-4 lg:flex-row lg:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        updateParams({
          search: String(form.get("search") || ""),
          status: String(form.get("status") || "all"),
          role_id: String(form.get("role_id") || ""),
        });
      }}
    >
      <div className="flex-1 space-y-2">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          name="search"
          defaultValue={search}
          placeholder="Search name or email…"
        />
      </div>
      <div className="space-y-2 sm:w-44">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={status}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
      <div className="space-y-2 sm:w-52">
        <Label htmlFor="role_id">Role</Label>
        <select
          id="role_id"
          name="role_id"
          defaultValue={roleId}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">All roles</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Filtering…" : "Apply"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            startTransition(() => router.push(pathname));
          }}
        >
          Clear
        </Button>
      </div>
    </form>
  );
}
