"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { AlertTriangle, BellRing, CalendarCheck2 } from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  type NotificationActionState,
} from "@/actions/notifications";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatIstDateTime, formatRelativeTime } from "@/lib/datetime/ist";
import type {
  Notification,
  ReminderAlertCounts,
} from "@/lib/db/notifications";
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

function CountChip({
  href,
  label,
  count,
  icon,
  className,
}: {
  href: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-2.5 py-2 transition-colors",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
        {icon}
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums leading-none">
        {count > 99 ? "99+" : count}
      </span>
    </Link>
  );
}

export function NotificationInbox({
  notifications: initialNotifications,
  unreadCount: initialUnread,
  reminderCounts: initialCounts,
  onUnreadChange,
}: {
  notifications: Notification[];
  unreadCount: number;
  reminderCounts: ReminderAlertCounts;
  onUnreadChange?: (count: number) => void;
}) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnread);
  const [reminderCounts, setReminderCounts] = useState(initialCounts);

  useEffect(() => {
    setNotifications(initialNotifications);
    setUnreadCount(initialUnread);
    setReminderCounts(initialCounts);
  }, [initialNotifications, initialUnread, initialCounts]);

  function setUnread(next: number) {
    setUnreadCount(next);
    setReminderCounts((c) => ({ ...c, unread: next }));
    onUnreadChange?.(next);
  }

  async function markOne(formData: FormData) {
    const notificationId = String(formData.get("notificationId") || "");
    const prev = notifications;
    const prevUnread = unreadCount;

    setNotifications((list) =>
      list.map((n) =>
        n.id === notificationId && !n.read_at
          ? { ...n, read_at: new Date().toISOString() }
          : n,
      ),
    );
    if (prev.some((n) => n.id === notificationId && !n.read_at)) {
      setUnread(Math.max(0, prevUnread - 1));
    }

    const result: NotificationActionState =
      await markNotificationReadAction({}, formData);
    if (result.error) {
      setNotifications(prev);
      setUnread(prevUnread);
    }
  }

  async function markAll(formData: FormData) {
    const prev = notifications;
    const prevUnread = unreadCount;
    const now = new Date().toISOString();

    setNotifications((list) =>
      list.map((n) => (n.read_at ? n : { ...n, read_at: now })),
    );
    setUnread(0);

    const result: NotificationActionState =
      await markAllNotificationsReadAction({}, formData);
    if (result.error) {
      setNotifications(prev);
      setUnread(prevUnread);
    }
  }

  const attention =
    reminderCounts.overdue + reminderCounts.today + reminderCounts.unread;

  return (
    <div className="flex w-full flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <div>
          <p className="text-xs font-semibold tracking-tight">Reminders</p>
          <p className="text-[10px] text-muted-foreground">
            {attention > 0
              ? `${attention} item${attention === 1 ? "" : "s"} need attention`
              : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 ? (
          <form action={markAll}>
            <MarkAllButton />
          </form>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-1.5 px-3 pb-2">
        <CountChip
          href="/reminders?status=overdue"
          label="Overdue"
          count={reminderCounts.overdue}
          icon={<AlertTriangle className="size-3" />}
          className="bg-rose-500/10 text-rose-800 hover:bg-rose-500/15 dark:text-rose-200"
        />
        <CountChip
          href="/reminders?status=today"
          label="Today"
          count={reminderCounts.today}
          icon={<CalendarCheck2 className="size-3" />}
          className="bg-amber-500/10 text-amber-900 hover:bg-amber-500/15 dark:text-amber-200"
        />
        <CountChip
          href="/reminders"
          label="Unread"
          count={reminderCounts.unread}
          icon={<BellRing className="size-3" />}
          className="bg-sky-500/10 text-sky-900 hover:bg-sky-500/15 dark:text-sky-200"
        />
      </div>

      <div className="max-h-72 overflow-y-auto border-t">
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">
            No alerts for today yet. Today’s follow-ups and due reminders show up here.
          </p>
        ) : (
          <ul className="divide-y">
            {notifications.map((notification) => {
              const unread = !notification.read_at;
              return (
                <li key={notification.id}>
                  <form action={markOne}>
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
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px]",
                            notification.kind === "reminder_overdue" &&
                              "border-rose-300/60 bg-rose-500/10 text-rose-800 dark:text-rose-200",
                            notification.kind === "reminder_today" &&
                              "border-amber-300/60 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                          )}
                        >
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
