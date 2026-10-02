"use client";

import Link from "next/link";
import { Menu, Search, UserRound } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import type { AppUserSummary } from "@/components/layout/app-shell";
import { NotificationBell } from "@/components/layout/notification-bell";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Notification } from "@/lib/db/notifications";

type TopbarProps = {
  title?: string;
  user: AppUserSummary;
  notifications: Notification[];
  unreadCount: number;
  onMenuClick?: () => void;
};

export function Topbar({
  title = "Dashboard",
  user,
  notifications,
  unreadCount,
  onMenuClick,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="md:hidden"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu className="size-4" />
      </Button>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-sm font-semibold tracking-tight md:text-base">
          {title}
        </h1>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <div className="flex h-8 w-56 items-center gap-2 rounded-md border bg-muted/40 px-2.5 text-muted-foreground">
          <Search className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate text-xs">Search coming in a later phase</span>
        </div>
      </div>

      <NotificationBell notifications={notifications} unreadCount={unreadCount} />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Profile menu"
            />
          }
        >
          <UserRound className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{user.displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.roleName}
                </span>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/profile" />}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={logoutAction}>
            <button
              type="submit"
              className="relative flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-left text-sm text-destructive outline-hidden select-none hover:bg-destructive/10"
            >
              Log out
            </button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
