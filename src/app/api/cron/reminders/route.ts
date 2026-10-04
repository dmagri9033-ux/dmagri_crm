import { NextResponse } from "next/server";
import { purgeOldActivityLogs } from "@/lib/activity/purge-old-logs";
import { generateReminderNotifications } from "@/lib/notifications/generate-reminder-notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = request.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;

  // Manual local testing only — never accept query secrets in production.
  if (process.env.NODE_ENV !== "production") {
    const url = new URL(request.url);
    if (url.searchParams.get("secret") === secret) return true;
  }

  return false;
}

/**
 * Daily cron (Hobby-compatible): fan out today/overdue reminder notifications
 * and purge activity logs from before today IST.
 * Schedule in vercel.json: 30 0 * * * (06:00 IST).
 * Auth: Authorization: Bearer $CRON_SECRET (or ?secret= for manual runs).
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const errors: string[] = [];

  let reminders: Awaited<ReturnType<typeof generateReminderNotifications>> | null =
    null;
  try {
    reminders = await generateReminderNotifications();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("cron/reminders notifications failed:", message);
    errors.push(`reminders: ${message}`);
  }

  let activityLogs: Awaited<ReturnType<typeof purgeOldActivityLogs>> | null =
    null;
  try {
    activityLogs = await purgeOldActivityLogs();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("cron/reminders activity purge failed:", message);
    errors.push(`activityLogs: ${message}`);
  }

  const ok = errors.length === 0;
  return NextResponse.json(
    {
      ok,
      reminders,
      activityLogs,
      ...(errors.length ? { errors } : {}),
    },
    { status: ok ? 200 : 500 },
  );
}
