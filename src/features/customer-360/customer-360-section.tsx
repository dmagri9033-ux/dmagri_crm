"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function Customer360Section({
  id,
  title,
  count,
  children,
  defaultOpen = true,
}: {
  id: string;
  title: string;
  count?: number;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="rounded-xl border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left md:cursor-default"
        onClick={() => setOpen((value) => !value)}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {typeof count === "number" ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {count}
            </span>
          ) : null}
        </div>
        <ChevronDown
          className={cn(
            "size-4 text-muted-foreground transition-transform md:hidden",
            open && "rotate-180",
          )}
        />
      </button>
      <div className={cn("border-t px-4 py-4", !open && "hidden md:block")}>
        {children}
      </div>
    </section>
  );
}
