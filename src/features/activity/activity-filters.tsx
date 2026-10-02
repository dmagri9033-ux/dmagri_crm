"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ACTIVITY_ACTION_LABELS } from "@/lib/activity/labels";
import type { ProfileLite } from "@/lib/db/activity";
import { ACTIVITY_MODULES } from "@/validations/activity";

export function ActivityFilters({
  search,
  module,
  action,
  actorId,
  dateFrom,
  dateTo,
  actors,
  actions,
}: {
  search: string;
  module: string;
  action: string;
  actorId: string;
  dateFrom: string;
  dateTo: string;
  actors: ProfileLite[];
  actions: string[];
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

  const actionOptions = [
    ...new Set([...actions, ...Object.keys(ACTIVITY_ACTION_LABELS)]),
  ].sort();

  return (
    <form
      className="grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-2 lg:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        pushParams({
          search: String(form.get("search") || ""),
          module: String(form.get("module") || "all"),
          action: String(form.get("action") || ""),
          actorId: String(form.get("actorId") || ""),
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
          placeholder="Action, module, entity type…"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="module">Module</Label>
        <select
          id="module"
          name="module"
          defaultValue={module}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          {ACTIVITY_MODULES.map((m) => (
            <option key={m} value={m}>
              {m === "all" ? "All modules" : m}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="action">Action</Label>
        <select
          id="action"
          name="action"
          defaultValue={action}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">All actions</option>
          {actionOptions.map((code) => (
            <option key={code} value={code}>
              {ACTIVITY_ACTION_LABELS[code] ?? code}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="actorId">Actor</Label>
        <select
          id="actorId"
          name="actorId"
          defaultValue={actorId}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">All actors</option>
          {actors.map((actor) => (
            <option key={actor.id} value={actor.id}>
              {actor.display_name}
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
