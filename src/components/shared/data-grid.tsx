"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type GridSaveState = "idle" | "saving" | "saved" | "error";

/** Compact grid inputs — denser rows across list tables. */
export const gridCellInputClass =
  "h-7 w-full min-w-[4.5rem] rounded-md border border-transparent bg-transparent px-1.5 text-xs outline-none transition-colors hover:border-border focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60";

/** Slightly tighter type for dates and other numeric grid values. */
export const gridCellNumberClass = cn(
  gridCellInputClass,
  "tabular-nums font-normal tracking-tight",
);

/** Mobile / Mo No. fields — blue so numbers stand out at a glance. */
export const gridCellMobileClass = cn(
  gridCellNumberClass,
  "font-medium text-blue-700 placeholder:text-blue-700/40 focus:text-blue-800 dark:text-blue-300 dark:placeholder:text-blue-300/40 dark:focus:text-blue-200",
);

export const gridCellSelectClass = cn(
  gridCellInputClass,
  "appearance-none pr-6",
);

export const gridCellPad = "p-1";

export const gridTableClass =
  "w-full border-collapse text-xs";

export const gridHeaderRowClass =
  "bg-muted/70 text-left text-[11px] uppercase tracking-wide text-muted-foreground";

export const gridHeaderCellClass = "px-1.5 py-1.5 font-semibold";

/** Data rows — soft sky tint (same as former hover). */
export const gridDataRowClass =
  "border-t bg-sky-50/90 dark:bg-sky-950/25";

/** New / add-row — white so it stands apart from tinted data rows. */
export const gridAddRowClass =
  "border-b border-dashed border-border bg-white dark:bg-background";

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
