"use client";

import { useEffect, useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CollapsibleFiltersProps = {
  children: React.ReactNode;
  /** Page title / description shown on the left of the header row. */
  heading?: React.ReactNode;
  /** Action buttons (Add, Import, …) — Filter toggle is always rendered after these. */
  actions?: React.ReactNode;
  /** How many non-default filters are applied (badge on the closed button). */
  activeCount?: number;
  /** Open automatically when filters are already applied in the URL. */
  defaultOpen?: boolean;
  className?: string;
};

export function CollapsibleFilters({
  children,
  heading,
  actions,
  activeCount = 0,
  defaultOpen = false,
  className,
}: CollapsibleFiltersProps) {
  const [open, setOpen] = useState(defaultOpen || activeCount > 0);

  useEffect(() => {
    if (activeCount > 0) setOpen(true);
  }, [activeCount]);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {heading ? (
          <div className="min-w-0 flex-1">{heading}</div>
        ) : null}

        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-1.5 sm:w-auto">
          {actions ? (
            <div className="contents">{actions}</div>
          ) : null}
          <Button
            type="button"
            variant={open ? "secondary" : "outline"}
            size="sm"
            className="shrink-0"
            aria-expanded={open}
            aria-label={open ? "Close filters" : "Open filters"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? (
              <X className="size-4" />
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <Filter className="size-3.5" />
                <span>Filters</span>
                {activeCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-md bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                    {activeCount}
                  </span>
                ) : null}
              </span>
            )}
          </Button>
        </div>
      </div>

      {open ? children : null}
    </div>
  );
}
