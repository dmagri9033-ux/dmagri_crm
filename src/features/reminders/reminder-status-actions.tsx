"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  completeReminderAction,
  reopenReminderAction,
  snoozeReminderAction,
  type ReminderActionState,
} from "@/actions/reminders";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDatetimeLocalIst } from "@/lib/datetime/ist";
import type { ReminderWithRelations } from "@/lib/db/reminders";

function ActionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

function SnoozeSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Snoozing…" : "Snooze"}
    </Button>
  );
}

function addHoursIst(hours: number): string {
  const d = new Date(Date.now() + hours * 3_600_000);
  return toDatetimeLocalIst(d);
}

function tomorrowNineIst(): string {
  const nowLocal = toDatetimeLocalIst(new Date());
  const [datePart] = nowLocal.split("T");
  const tomorrow = new Date(`${datePart}T00:00:00+05:30`);
  tomorrow.setTime(tomorrow.getTime() + 24 * 60 * 60 * 1000);
  const y = tomorrow.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return `${y}T09:00`;
}

export function ReminderStatusActions({
  reminder,
}: {
  reminder: ReminderWithRelations;
}) {
  const router = useRouter();
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [completeState, completeAction] = useActionState<
    ReminderActionState,
    FormData
  >(completeReminderAction, {});
  const [reopenState, reopenAction] = useActionState<ReminderActionState, FormData>(
    reopenReminderAction,
    {},
  );
  const [snoozeState, snoozeAction] = useActionState<ReminderActionState, FormData>(
    snoozeReminderAction,
    {},
  );

  useEffect(() => {
    if (completeState.success || reopenState.success || snoozeState.success) {
      setSnoozeOpen(false);
      router.refresh();
    }
  }, [completeState.success, reopenState.success, snoozeState.success, router]);

  const defaultSnooze = useMemo(() => addHoursIst(1), []);
  const isClosed =
    reminder.ui_status === "completed" || reminder.ui_status === "cancelled";

  return (
    <div className="flex flex-wrap gap-2">
      {!isClosed ? (
        <>
          <Can permission="reminder.complete">
            <form action={completeAction}>
              <input type="hidden" name="reminderId" value={reminder.id} />
              <ActionButton label="Complete" />
            </form>
          </Can>
          <Can permission="reminder.update">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setSnoozeOpen(true)}
            >
              Snooze
            </Button>
          </Can>
        </>
      ) : (
        <Can permission="reminder.update">
          <form action={reopenAction}>
            <input type="hidden" name="reminderId" value={reminder.id} />
            <ActionButton label="Reopen" />
          </form>
        </Can>
      )}

      {(completeState.error || reopenState.error) && (
        <p className="w-full text-xs text-destructive">
          {completeState.error || reopenState.error}
        </p>
      )}

      <Dialog open={snoozeOpen} onOpenChange={setSnoozeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Snooze reminder</DialogTitle>
            <DialogDescription>
              Sets snoozed until and moves the remind time (IST).
            </DialogDescription>
          </DialogHeader>
          <form action={snoozeAction} className="space-y-3">
            <input type="hidden" name="reminderId" value={reminder.id} />
            {snoozeState.error ? (
              <p className="text-sm text-destructive">{snoozeState.error}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const input = document.getElementById(
                    `snooze-${reminder.id}`,
                  ) as HTMLInputElement | null;
                  if (input) input.value = addHoursIst(1);
                }}
              >
                +1 hour
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const input = document.getElementById(
                    `snooze-${reminder.id}`,
                  ) as HTMLInputElement | null;
                  if (input) input.value = tomorrowNineIst();
                }}
              >
                Tomorrow 9:00
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const input = document.getElementById(
                    `snooze-${reminder.id}`,
                  ) as HTMLInputElement | null;
                  if (input) input.value = addHoursIst(72);
                }}
              >
                +3 days
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`snooze-${reminder.id}`}>Until (IST)</Label>
              <Input
                id={`snooze-${reminder.id}`}
                name="until_local"
                type="datetime-local"
                required
                defaultValue={defaultSnooze}
              />
            </div>
            <div className="flex justify-end">
              <SnoozeSubmit />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
