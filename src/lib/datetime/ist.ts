const IST = "Asia/Kolkata";

/** Start of "today" in Asia/Kolkata as a UTC Date. */
export function startOfTodayIst(now = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return new Date(`${year}-${month}-${day}T00:00:00+05:30`);
}

export function endOfTodayIst(now = new Date()): Date {
  const start = startOfTodayIst(now);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Parse `<input type="datetime-local">` wall time as Asia/Kolkata. */
export function parseIstDateTimeLocal(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) return new Date(Number.NaN);
  if (trimmed.includes("+") || trimmed.endsWith("Z")) {
    return new Date(trimmed);
  }
  const normalized = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed}:00`
    : trimmed;
  return new Date(`${normalized}+05:30`);
}

/** Format a timestamp for `<input type="datetime-local">` in IST. */
export function toDatetimeLocalIst(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatIstDate(value: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    dateStyle: "medium",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatIstDateTime(value: string | Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: IST,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function formatRelativeTime(value: string | Date, now = new Date()): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = date.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  const minutes = Math.round(abs / 60_000);
  if (minutes < 60) return rtf.format(Math.sign(diffMs) * Math.max(1, minutes), "minute");

  const hours = Math.round(abs / 3_600_000);
  if (hours < 48) return rtf.format(Math.sign(diffMs) * hours, "hour");

  const days = Math.round(abs / 86_400_000);
  return rtf.format(Math.sign(diffMs) * days, "day");
}

/** Calendar date YYYY-MM-DD in Asia/Kolkata (for dedupe keys). */
export function istCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: IST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export type ReminderUiStatus =
  | "completed"
  | "cancelled"
  | "overdue"
  | "today"
  | "upcoming";

/**
 * Effective remind time: if actively snoozed into the future, use snoozed_until;
 * otherwise remind_at. Buckets use Asia/Kolkata day boundaries.
 */
export function getReminderUiStatus(
  remindAt: string,
  completedAt: string | null,
  cancelledAt: string | null,
  snoozedUntil: string | null = null,
  now = new Date(),
): ReminderUiStatus {
  if (completedAt) return "completed";
  if (cancelledAt) return "cancelled";

  const snooze = snoozedUntil ? new Date(snoozedUntil) : null;
  const at =
    snooze && !Number.isNaN(snooze.getTime()) && snooze.getTime() > now.getTime()
      ? snooze
      : new Date(remindAt);

  const dayStart = startOfTodayIst(now);
  const dayEnd = endOfTodayIst(now);

  if (at < dayStart) return "overdue";
  if (at <= dayEnd) return "today";
  return "upcoming";
}

export function isActivelySnoozed(
  snoozedUntil: string | null,
  now = new Date(),
): boolean {
  if (!snoozedUntil) return false;
  const until = new Date(snoozedUntil);
  return !Number.isNaN(until.getTime()) && until.getTime() > now.getTime();
}
