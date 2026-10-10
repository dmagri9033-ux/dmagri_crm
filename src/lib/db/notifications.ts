import { cache } from "react";
import { getAuthUser } from "@/lib/auth/session";
import {
  endOfTodayIst,
  startOfTodayIst,
} from "@/lib/datetime/ist";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";

export type Notification = Tables<"notifications">;

export type ReminderAlertCounts = {
  overdue: number;
  today: number;
  unread: number;
};

export type NotificationListResult = {
  notifications: Notification[];
  unreadCount: number;
  reminderCounts: ReminderAlertCounts;
};

async function countAssignedReminders(
  userId: string,
  range: "overdue" | "today",
): Promise<number> {
  const supabase = await createClient();
  const dayStart = startOfTodayIst().toISOString();
  const dayEnd = endOfTodayIst().toISOString();

  let query = supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("assigned_user_id", userId)
    .is("deleted_at", null)
    .is("completed_at", null)
    .is("cancelled_at", null);

  if (range === "overdue") {
    query = query.lt("remind_at", dayStart);
  } else {
    query = query.gte("remind_at", dayStart).lte("remind_at", dayEnd);
  }

  const { count, error } = await query;
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export const listMyNotifications = cache(
  async (limit = 25): Promise<NotificationListResult> => {
    const empty: NotificationListResult = {
      notifications: [],
      unreadCount: 0,
      reminderCounts: { overdue: 0, today: 0, unread: 0 },
    };

    const user = await getAuthUser();
    if (!user) return empty;

    const supabase = await createClient();
    // Bell inbox: only alerts generated today (IST) — hide older "7 days ago" rows.
    const todayStartIso = startOfTodayIst().toISOString();

    const [
      { data, error },
      unreadRes,
      overdue,
      today,
    ] = await Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", todayStartIso)
        .in("kind", ["reminder_today", "reminder_overdue"])
        .order("created_at", { ascending: false })
        .limit(limit),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", todayStartIso)
        .in("kind", ["reminder_today", "reminder_overdue"])
        .is("read_at", null),
      countAssignedReminders(user.id, "overdue"),
      countAssignedReminders(user.id, "today"),
    ]);

    if (error) throw new Error(error.message);
    if (unreadRes.error) throw new Error(unreadRes.error.message);

    const unreadCount = unreadRes.count ?? 0;

    return {
      notifications: data ?? [],
      unreadCount,
      reminderCounts: {
        overdue,
        today,
        unread: unreadCount,
      },
    };
  },
);

export async function markNotificationRead(notificationId: string) {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");

  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) throw new Error(error.message);
}
