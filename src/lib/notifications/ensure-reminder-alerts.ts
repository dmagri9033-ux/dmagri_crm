import { cache } from "react";
import { unstable_cache } from "next/cache";
import { generateReminderNotifications } from "@/lib/notifications/generate-reminder-notifications";
import { syncTodayFollowupsToReminders } from "@/lib/reminders/sync-followups-to-reminders";

/**
 * Cross-request throttle — layout used to re-run full sync on every navigation (~1–2s).
 * Cron still does the authoritative pass; this keeps the bell roughly fresh.
 */
const syncReminderAlertsThrottled = unstable_cache(
  async () => {
    const followups = await syncTodayFollowupsToReminders();
    const notifications = await generateReminderNotifications();
    return { followups, notifications };
  },
  ["reminder-alerts-sync-v2"],
  { revalidate: 90 },
);

/**
 * Keep today follow-ups → reminders → notifications in sync.
 * Cached once per request + throttled across requests.
 */
export const ensureReminderAlertsFresh = cache(async () => {
  return syncReminderAlertsThrottled();
});
