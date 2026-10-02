"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { mainNavItems } from "@/lib/navigation";
import type { Notification } from "@/lib/db/notifications";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type AppUserSummary = {
  displayName: string;
  email: string;
  roleName: string;
};

type AppShellProps = {
  children: React.ReactNode;
  user: AppUserSummary;
  notifications: Notification[];
  unreadCount: number;
};

export function AppShell({
  children,
  user,
  notifications,
  unreadCount,
}: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const title = useMemo(() => {
    if (pathname.startsWith("/profile")) return "Profile";
    const match = mainNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return match?.title ?? "DM Agree CRM";
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar className="hidden md:flex" />

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar
            className="w-full border-r-0"
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          user={user}
          notifications={notifications}
          unreadCount={unreadCount}
          onMenuClick={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
