import { startOfTodayIst, istCalendarDate } from "@/lib/datetime/ist";
import { createAdminClient } from "@/lib/supabase/admin";

export type PurgeOldActivityLogsResult = {
  deleted: number;
  cutoff: string;
  istDate: string;
};

/**
 * Deletes activity_logs from before today (Asia/Kolkata midnight).
 * Uses the service-role client (no DELETE RLS on activity_logs).
 * Safe to run daily — idempotent once prior days are gone.
 */
export async function purgeOldActivityLogs(
  now = new Date(),
): Promise<PurgeOldActivityLogsResult> {
  const supabase = createAdminClient();
  const cutoff = startOfTodayIst(now).toISOString();
  const istDate = istCalendarDate(now);

  const { data, error } = await supabase
    .from("activity_logs")
    .delete()
    .lt("created_at", cutoff)
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return {
    deleted: data?.length ?? 0,
    cutoff,
    istDate,
  };
}
