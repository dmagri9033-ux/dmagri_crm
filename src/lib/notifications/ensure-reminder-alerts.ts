import { cache } from "react";
import { generateReminderNotifications } from "@/lib/notifications/generate-reminder-notifications";
import { syncTodayFollowupsToReminders } from "@/lib/reminders/sync-followups-to-reminders";

/**
 * Keep today follow-ups → reminders → notifications in sync.
 * Cached once per request (layout + pages sharing the same RSC tree).
 */
export const ensureReminderAlertsFresh = cache(async () => {
  const followups = await syncTodayFollowupsToReminders();
  const notifications = await generateReminderNotifications();
  return { followups, notifications };
});
