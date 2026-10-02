"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { NotificationInbox } from "@/features/notifications/notification-inbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Notification } from "@/lib/db/notifications";

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <NotificationInbox
          notifications={notifications}
          unreadCount={unreadCount}
        />
        <DropdownMenuSeparator className="my-0" />
        <div className="px-3 py-2">
          <Button
            render={<Link href="/reminders" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs"
          >
            Open reminders
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
