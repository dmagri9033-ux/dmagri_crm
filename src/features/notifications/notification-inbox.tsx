"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationActionState,
} from "@/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIstDateTime, formatRelativeTime } from "@/lib/datetime/ist";
import type { Notification } from "@/lib/db/notifications";
import { cn } from "@/lib/utils";

function MarkAllButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs" disabled={pending}>
      {pending ? "…" : "Mark all read"}
    </Button>
  );
}

function kindLabel(kind: string) {
  switch (kind) {
    case "reminder_overdue":
      return "Overdue";
    case "reminder_today":
      return "Today";
    case "reminder_upcoming":
      return "Upcoming";
    default:
      return "System";
  }
}

export function NotificationInbox({
  notifications,
  unreadCount,
}: {
  notifications: Notification[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [markOneState, markOneAction] = useActionState<
    NotificationActionState,
    FormData
  >(markNotificationReadAction, {});
  const [markAllState, markAllAction] = useActionState<
    NotificationActionState,
    FormData
  >(markAllNotificationsReadAction, {});

  useEffect(() => {
    if (markOneState.success || markAllState.success) {
      router.refresh();
    }
  }, [markOneState.success, markAllState.success, router]);

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <p className="text-xs font-medium text-muted-foreground">Notifications</p>
        {unreadCount > 0 ? (
          <form action={markAllAction}>
            <MarkAllButton />
          </form>
        ) : null}
      </div>
      <div className="max-h-80 overflow-y-auto border-t">
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No notifications yet. Reminder alerts appear for today and overdue
            items.
          </p>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => {
              const unread = !notification.read_at;
              return (
                <li key={notification.id}>
                  <form action={markOneAction}>
                    <input
                      type="hidden"
                      name="notificationId"
                      value={notification.id}
                    />
                    <button
                      type="submit"
                      className={cn(
                        "flex w-full flex-col gap-1 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
                        unread && "bg-muted/30",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {kindLabel(notification.kind)}
                        </Badge>
                        {unread ? (
                          <span className="size-1.5 rounded-full bg-destructive" />
                        ) : null}
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {formatRelativeTime(notification.created_at)}
                        </span>
                      </div>
                      <p className="font-medium leading-snug">{notification.title}</p>
                      {notification.body ? (
                        <p className="text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                      ) : null}
                      <p className="text-[10px] text-muted-foreground">
                        {formatIstDateTime(notification.created_at)}
                      </p>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
