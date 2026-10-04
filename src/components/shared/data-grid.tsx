"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type GridSaveState = "idle" | "saving" | "saved" | "error";

export const gridCellInputClass =
  "h-9 w-full min-w-[6.5rem] rounded-md border border-transparent bg-transparent px-2 text-sm outline-none transition-colors hover:border-border focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60";

/** Slightly smaller type for dates, mobiles, and other numeric grid values. */
export const gridCellNumberClass = cn(
  gridCellInputClass,
  "text-xs tabular-nums font-normal tracking-tight",
);

export const gridCellSelectClass = cn(
  gridCellInputClass,
  "appearance-none pr-6",
);

export function GridSaveIndicator({
  state,
  error,
}: {
  state: GridSaveState;
  error?: string;
}) {
  if (state === "idle") return null;
  if (state === "saving") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving
      </span>
    );
  }
  if (state === "error") {
    return (
      <span className="text-[10px] text-destructive" title={error}>
        {error || "Error"}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400">
      <Check className="size-3" />
      Saved
    </span>
  );
}

export function todayIstDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

export function formatGridDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}
