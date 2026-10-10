"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { mainNavItems } from "@/lib/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
const SIDEBAR_STORAGE_KEY = "dm-agree-sidebar-open";
/** Match Tailwind `lg` — drawer below this, persistent sidebar at/above. */
const DESKTOP_MQ = "(min-width: 1024px)";

export type AppUserSummary = {
  displayName: string;
  email: string;
  roleName: string;
};

type AppShellProps = {
  children: React.ReactNode;
  user: AppUserSummary;
  notifications: React.ReactNode;
};

export function AppShell({ children, user, notifications }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === "0") setDesktopOpen(false);
      else if (stored === "1") setDesktopOpen(true);
    } catch {
      // ignore storage errors
    }

    const mq = window.matchMedia(DESKTOP_MQ);
    const syncDesktop = () => {
      setIsDesktop(mq.matches);
      if (mq.matches) setMobileOpen(false);
    };
    syncDesktop();
    mq.addEventListener("change", syncDesktop);
    setHydrated(true);
    return () => mq.removeEventListener("change", syncDesktop);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        desktopOpen ? "1" : "0",
      );
    } catch {
      // ignore storage errors
    }
  }, [desktopOpen, hydrated]);

  // Close mobile drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const title = useMemo(() => {
    if (pathname.startsWith("/profile")) return "Profile";
    const match = mainNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
    );
    return match?.title ?? "DM Agree CRM";
  }, [pathname]);

  function handleMenuClick() {
    if (isDesktop) {
      setDesktopOpen((open) => !open);
      return;
    }
    setMobileOpen(true);
  }

  return (
    <div className="flex h-svh min-h-0 overflow-hidden bg-background">
      <div className="hidden h-svh shrink-0 lg:flex">
        <Sidebar
          className="h-full"
          collapsed={hydrated ? !desktopOpen : false}
          showCollapseControl
          onToggleCollapse={() => setDesktopOpen((open) => !open)}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton
          className="w-[min(20rem,calc(100vw-2.5rem))] max-w-none gap-0 p-0 lg:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <Sidebar
            className="h-full w-full border-r-0"
            collapsed={false}
            onNavigate={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar
          title={title}
          user={user}
          notifications={notifications}
          onMenuClick={handleMenuClick}
          sidebarOpen={desktopOpen}
          isDesktop={isDesktop}
        />
        <main className="min-h-0 flex-1 overflow-auto overscroll-contain p-3 sm:p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
