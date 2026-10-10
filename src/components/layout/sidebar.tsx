"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen, Sprout } from "lucide-react";
import { cn } from "@/lib/utils";
import { mainNavItems } from "@/lib/navigation";
import { usePermissions } from "@/components/providers/permissions-provider";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

type SidebarProps = {
  className?: string;
  onNavigate?: () => void;
  /** When true, show icons only (desktop collapse). */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  showCollapseControl?: boolean;
};

export function Sidebar({
  className,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
  showCollapseControl = false,
}: SidebarProps) {
  const pathname = usePathname();
  const { can } = usePermissions();

  const visibleItems = mainNavItems.filter((item) => can(item.permission));

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        "transition-[width] duration-200 ease-out",
        collapsed ? "w-[4.5rem]" : "w-64",
        className,
      )}
    >
      <div
        className={cn(
          "flex h-14 shrink-0 items-center gap-2",
          collapsed ? "justify-center px-2" : "px-3",
        )}
      >
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
          <Sprout className="size-4" aria-hidden />
        </div>
        {!collapsed ? (
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight">
              DM Agree CRM
            </p>
            <p className="truncate text-xs text-muted-foreground">Internal</p>
          </div>
        ) : null}
        {showCollapseControl && onToggleCollapse ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn("shrink-0", collapsed && "hidden")}
            onClick={onToggleCollapse}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </Button>
        ) : null}
      </div>

      <Separator className="shrink-0" />

      <ScrollArea className="min-h-0 flex-1 px-2 py-3">
        <nav className="flex flex-col gap-0.5" aria-label="Main">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={onNavigate}
                title={item.title}
                aria-label={item.title}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center rounded-md text-sm transition-colors",
                  collapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-2.5 px-2.5 py-2",
                  active
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {!collapsed ? (
                  <span className="truncate">{item.title}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {showCollapseControl && onToggleCollapse && collapsed ? (
        <div className="shrink-0 border-t border-sidebar-border p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="w-full"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeftOpen className="size-4" />
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
