import { istCalendarDate } from "@/lib/datetime/ist";
import { createAdminClient } from "@/lib/supabase/admin";

export type SyncFollowupsToRemindersResult = {
  istDate: string;
  scanned: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function remindAtIsoForFollowupDate(followupDate: string): string {
  // Mid-morning IST so the reminder lands in the "today" bucket.
  return new Date(`${followupDate}T09:00:00+05:30`).toISOString();
}

/**
 * Idempotent: open follow-ups dated today become reminders for the creator.
 * Safe for cron + layout refresh — unique source_followup_id prevents dupes.
 */
export async function syncTodayFollowupsToReminders(
  now = new Date(),
): Promise<SyncFollowupsToRemindersResult> {
  const supabase = createAdminClient();
  const istDate = istCalendarDate(now);

  const { data: followups, error } = await supabase
    .from("followups")
    .select(
      `
      id,
      customer_id,
      inquiry_id,
      followup_date,
      notes,
      created_by,
      completed_at,
      customers:customer_id ( name )
    `,
    )
    .is("deleted_at", null)
    .is("completed_at", null)
    .eq("followup_date", istDate)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) throw new Error(error.message);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const row of followups ?? []) {
    const customerJoin = row.customers as
      | { name: string }
      | { name: string }[]
      | null;
    const customerName = Array.isArray(customerJoin)
      ? customerJoin[0]?.name
      : customerJoin?.name;

    const title = customerName
      ? `Follow-up: ${customerName}`
      : "Follow-up due today";
    const notes = row.notes?.trim() || null;
    const remindAt = remindAtIsoForFollowupDate(row.followup_date);

    const { data: existing, error: existingError } = await supabase
      .from("reminders")
      .select("id, completed_at, cancelled_at, deleted_at")
      .eq("source_followup_id", row.id)
      .is("deleted_at", null)
      .maybeSingle();

    if (existingError) {
      errors.push(`${row.id}: ${existingError.message}`);
      continue;
    }

    if (existing) {
      if (existing.completed_at || existing.cancelled_at) {
        skipped += 1;
        continue;
      }
      const { error: updateError } = await supabase
        .from("reminders")
        .update({
          title,
          notes,
          remind_at: remindAt,
          customer_id: row.customer_id,
          inquiry_id: row.inquiry_id,
          assigned_user_id: row.created_by,
        })
        .eq("id", existing.id);
      if (updateError) {
        errors.push(`${row.id}: ${updateError.message}`);
        continue;
      }
      updated += 1;
      continue;
    }

    const { error: insertError } = await supabase.from("reminders").insert({
      title,
      customer_id: row.customer_id,
      inquiry_id: row.inquiry_id,
      remind_at: remindAt,
      notes,
      assigned_user_id: row.created_by,
      created_by: row.created_by,
      source_followup_id: row.id,
    });

    if (insertError) {
      // Unique race / already linked
      if (insertError.code === "23505") {
        skipped += 1;
        continue;
      }
      errors.push(`${row.id}: ${insertError.message}`);
      continue;
    }

    created += 1;
  }

  return {
    istDate,
    scanned: followups?.length ?? 0,
    created,
    updated,
    skipped,
    errors,
  };
}

/** When a follow-up is completed, complete its linked auto-reminder. */
export async function completeReminderForFollowup(followupId: string) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("reminders")
    .update({ completed_at: now })
    .eq("source_followup_id", followupId)
    .is("deleted_at", null)
    .is("completed_at", null)
    .is("cancelled_at", null);

  if (error) throw new Error(error.message);
}

/** Reopen linked reminder when a follow-up is reopened. */
export async function reopenReminderForFollowup(followupId: string) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("reminders")
    .update({ completed_at: null })
    .eq("source_followup_id", followupId)
    .is("deleted_at", null)
    .is("cancelled_at", null);

  if (error) throw new Error(error.message);
}
