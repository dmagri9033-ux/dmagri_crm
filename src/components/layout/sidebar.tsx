"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/navigation";
import { usePermissions } from "@/components/providers/permissions-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleItems = mainNavItems.filter((item) => can(item.permission));

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Sprout className="size-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">DM Agree CRM</p>
          <p className="truncate text-xs text-muted-foreground">Internal</p>
        </div>
      </div>

      <Separator />

      <ScrollArea className="flex-1 px-3 py-3">
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <p className="px-1 text-xs text-muted-foreground">
          Phase 16 — testing.
        </p>
      </div>
    </aside>
  );
}
