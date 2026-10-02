import { describe, expect, it } from "vitest";
import {
  endOfTodayIst,
  getReminderUiStatus,
  isActivelySnoozed,
  istCalendarDate,
  parseIstDateTimeLocal,
  startOfTodayIst,
} from "@/lib/datetime/ist";

/** Fixed instant: 2026-10-02 12:00 IST (= 06:30 UTC). */
const NOW = new Date("2026-10-02T06:30:00.000Z");

describe("IST day boundaries", () => {
  it("computes start/end of today in Asia/Kolkata", () => {
    const start = startOfTodayIst(NOW);
    const end = endOfTodayIst(NOW);
    expect(start.toISOString()).toBe("2026-10-01T18:30:00.000Z");
    expect(end.getTime()).toBe(start.getTime() + 86_400_000 - 1);
    expect(istCalendarDate(NOW)).toBe("2026-10-02");
  });

  it("parses datetime-local as IST wall time", () => {
    const parsed = parseIstDateTimeLocal("2026-10-02T09:15");
    expect(parsed.toISOString()).toBe("2026-10-02T03:45:00.000Z");
  });
});

describe("getReminderUiStatus", () => {
  it("returns completed and cancelled first", () => {
    expect(
      getReminderUiStatus(
        "2026-10-02T03:00:00.000Z",
        "2026-10-02T04:00:00.000Z",
        null,
        null,
        NOW,
      ),
    ).toBe("completed");
    expect(
      getReminderUiStatus(
        "2026-10-02T03:00:00.000Z",
        null,
        "2026-10-02T04:00:00.000Z",
        null,
        NOW,
      ),
    ).toBe("cancelled");
  });

  it("classifies overdue / today / upcoming by IST day", () => {
    expect(
      getReminderUiStatus(
        "2026-10-01T10:00:00.000Z",
        null,
        null,
        null,
        NOW,
      ),
    ).toBe("overdue");
    expect(
      getReminderUiStatus(
        "2026-10-02T08:00:00.000Z",
        null,
        null,
        null,
        NOW,
      ),
    ).toBe("today");
    expect(
      getReminderUiStatus(
        "2026-10-03T08:00:00.000Z",
        null,
        null,
        null,
        NOW,
      ),
    ).toBe("upcoming");
  });

  it("uses future snoozed_until as effective remind time", () => {
    expect(
      getReminderUiStatus(
        "2026-10-01T10:00:00.000Z",
        null,
        null,
        "2026-10-03T08:00:00.000Z",
        NOW,
      ),
    ).toBe("upcoming");
  });
});

describe("isActivelySnoozed", () => {
  it("is true only when snooze is in the future", () => {
    expect(isActivelySnoozed("2026-10-03T08:00:00.000Z", NOW)).toBe(true);
    expect(isActivelySnoozed("2026-10-01T08:00:00.000Z", NOW)).toBe(false);
    expect(isActivelySnoozed(null, NOW)).toBe(false);
  });
});
