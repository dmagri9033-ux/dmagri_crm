"use client";

import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen, UserRound } from "lucide-react";
import { logoutAction } from "@/actions/auth";
import type { AppUserSummary } from "@/components/layout/app-shell";
import { GlobalCustomerSearch } from "@/components/layout/global-customer-search";
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

type TopbarProps = {
  title?: string;
  user: AppUserSummary;
  notifications: React.ReactNode;
  onMenuClick?: () => void;
  sidebarOpen?: boolean;
  isDesktop?: boolean;
};

export function Topbar({
  title = "Dashboard",
  user,
  notifications,
  onMenuClick,
  sidebarOpen = true,
  isDesktop = false,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur supports-backdrop-filter:bg-background/80 sm:gap-3 sm:px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="shrink-0"
        onClick={onMenuClick}
        aria-label={
          isDesktop
            ? sidebarOpen
              ? "Collapse sidebar"
              : "Expand sidebar"
            : "Open navigation"
        }
        title={
          isDesktop
            ? sidebarOpen
              ? "Collapse sidebar"
              : "Expand sidebar"
            : "Open menu"
        }
      >
        {isDesktop ? (
          sidebarOpen ? (
            <PanelLeftClose className="size-4" />
          ) : (
            <PanelLeftOpen className="size-4" />
          )
        ) : (
          <Menu className="size-4" />
        )}
      </Button>

      <div className="min-w-0 shrink">
        <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
          {title}
        </h1>
      </div>

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <GlobalCustomerSearch />
        {notifications}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
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
                  <span className="truncate text-sm font-medium">
                    {user.displayName}
                  </span>
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
      </div>
    </header>
  );
}
