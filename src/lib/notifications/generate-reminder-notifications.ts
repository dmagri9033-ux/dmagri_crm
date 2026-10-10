import {
  endOfTodayIst,
  getReminderUiStatus,
  istCalendarDate,
} from "@/lib/datetime/ist";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReminderNotificationKind = "reminder_today" | "reminder_overdue";

export type GenerateReminderNotificationsResult = {
  scanned: number;
  created: number;
  skipped: number;
  errors: string[];
  istDate: string;
};

/**
 * Idempotent fan-out: create today/overdue reminder notifications for assignees.
 * Uses service-role client. Safe to run hourly — unique dedupe_key prevents dupes.
 */
export async function generateReminderNotifications(
  now = new Date(),
): Promise<GenerateReminderNotificationsResult> {
  const supabase = createAdminClient();
  const istDate = istCalendarDate(now);
  const untilIso = endOfTodayIst(now).toISOString();

  const { data: reminders, error } = await supabase
    .from("reminders")
    .select(
      `
      id,
      title,
      customer_id,
      assigned_user_id,
      remind_at,
      snoozed_until,
      completed_at,
      cancelled_at,
      customers:customer_id ( name )
    `,
    )
    .is("deleted_at", null)
    .is("completed_at", null)
    .is("cancelled_at", null)
    .lte("remind_at", untilIso)
    .order("remind_at", { ascending: true })
    .limit(500);

  if (error) {
    throw new Error(error.message);
  }

  let skipped = 0;
  const errors: string[] = [];
  const toInsert: {
    user_id: string;
    reminder_id: string;
    kind: ReminderNotificationKind;
    title: string;
    body: string;
    dedupe_key: string;
  }[] = [];

  for (const row of reminders ?? []) {
    const status = getReminderUiStatus(
      row.remind_at,
      row.completed_at,
      row.cancelled_at,
      row.snoozed_until,
      now,
    );

    let kind: ReminderNotificationKind | null = null;
    if (status === "overdue") kind = "reminder_overdue";
    else if (status === "today") kind = "reminder_today";
    else {
      skipped += 1;
      continue;
    }

    const customerJoin = row.customers as
      | { name: string }
      | { name: string }[]
      | null;
    const customerName = Array.isArray(customerJoin)
      ? customerJoin[0]?.name
      : customerJoin?.name;

    const statusLabel = kind === "reminder_overdue" ? "overdue" : "today";
    const dedupeKey = `reminder:${row.id}:${statusLabel}:${istDate}`;
    const title =
      kind === "reminder_overdue"
        ? `Overdue: ${row.title}`
        : `Due today: ${row.title}`;
    const body = customerName
      ? `Customer: ${customerName}`
      : "Open Reminders to review.";

    toInsert.push({
      user_id: row.assigned_user_id,
      reminder_id: row.id,
      kind,
      title,
      body,
      dedupe_key: dedupeKey,
    });
  }

  let created = 0;
  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("notifications")
      .upsert(toInsert, {
        onConflict: "dedupe_key",
        ignoreDuplicates: true,
      });

    if (insertError) {
      for (const row of toInsert) {
        const { error: oneError } = await supabase
          .from("notifications")
          .insert(row);
        if (oneError) {
          if (oneError.code === "23505") {
            skipped += 1;
            continue;
          }
          errors.push(`${row.reminder_id}: ${oneError.message}`);
          continue;
        }
        created += 1;
      }
    } else {
      // Upsert with ignoreDuplicates does not report how many were new.
      created = toInsert.length;
    }
  }

  return {
    scanned: reminders?.length ?? 0,
    created,
    skipped,
    errors,
    istDate,
  };
}
