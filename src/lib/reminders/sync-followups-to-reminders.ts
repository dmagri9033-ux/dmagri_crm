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

  const rows = followups ?? [];
  if (rows.length === 0) {
    return {
      istDate,
      scanned: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };
  }

  const followupIds = rows.map((r) => r.id);
  const { data: existingReminders, error: existingError } = await supabase
    .from("reminders")
    .select("id, source_followup_id, completed_at, cancelled_at, deleted_at")
    .in("source_followup_id", followupIds)
    .is("deleted_at", null);

  if (existingError) throw new Error(existingError.message);

  const existingByFollowup = new Map(
    (existingReminders ?? [])
      .filter((r) => r.source_followup_id)
      .map((r) => [r.source_followup_id as string, r]),
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];
  const toInsert: {
    title: string;
    customer_id: string;
    inquiry_id: string | null;
    remind_at: string;
    notes: string | null;
    assigned_user_id: string;
    created_by: string;
    source_followup_id: string;
  }[] = [];

  for (const row of rows) {
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
    const existing = existingByFollowup.get(row.id);

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

    toInsert.push({
      title,
      customer_id: row.customer_id,
      inquiry_id: row.inquiry_id,
      remind_at: remindAt,
      notes,
      assigned_user_id: row.created_by,
      created_by: row.created_by,
      source_followup_id: row.id,
    });
  }

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from("reminders")
      .insert(toInsert);
    if (insertError) {
      // Fallback: insert one-by-one so one conflict does not fail the batch.
      for (const row of toInsert) {
        const { error: oneError } = await supabase.from("reminders").insert(row);
        if (oneError) {
          if (oneError.code === "23505") {
            skipped += 1;
            continue;
          }
          errors.push(`${row.source_followup_id}: ${oneError.message}`);
          continue;
        }
        created += 1;
      }
    } else {
      created += toInsert.length;
    }
  }

  return {
    istDate,
    scanned: rows.length,
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
