"use client";

import { useEffect, useState } from "react";
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
import type {
  Notification,
  ReminderAlertCounts,
} from "@/lib/db/notifications";

export function NotificationBell({
  notifications,
  unreadCount: initialUnread,
  reminderCounts,
}: {
  notifications: Notification[];
  unreadCount: number;
  reminderCounts: ReminderAlertCounts;
}) {
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const dueCount = reminderCounts.overdue + reminderCounts.today;
  const badgeCount = dueCount > 0 ? dueCount : unreadCount;

  useEffect(() => {
    setUnreadCount(initialUnread);
  }, [initialUnread]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="relative"
            aria-label={`Reminders${badgeCount ? `, ${badgeCount} due` : ""}`}
          />
        }
      >
        <Bell className="size-4" />
        {badgeCount > 0 ? (
          <Badge
            variant="destructive"
            className="absolute -right-0.5 -top-0.5 h-4 min-w-4 px-1 text-[10px]"
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </Badge>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] p-0">
        <NotificationInbox
          notifications={notifications}
          unreadCount={initialUnread}
          reminderCounts={reminderCounts}
          onUnreadChange={setUnreadCount}
        />
        <DropdownMenuSeparator className="my-0" />
        <div className="px-3 py-2">
          <Button
            render={<Link href="/reminders?status=today" />}
            nativeButton={false}
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs"
          >
            Open today’s reminders
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
