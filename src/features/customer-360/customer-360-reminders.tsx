"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  completeReminderQuickAction,
  type Customer360ActionState,
} from "@/actions/customer-360";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Can } from "@/components/shared/can";
import { formatIstDateTime } from "@/lib/datetime/ist";
import type { Customer360Data } from "@/lib/db/customer-360";

function CompleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "…" : "Complete"}
    </Button>
  );
}

function ReminderGroup({
  title,
  tone,
  customerId,
  items,
}: {
  title: string;
  tone: "destructive" | "secondary" | "outline";
  customerId: string;
  items: Customer360Data["reminders"]["today"];
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<Customer360ActionState, FormData>(
    completeReminderQuickAction,
    {},
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h4 className="text-sm font-medium">{title}</h4>
        <Badge variant={tone}>{items.length}</Badge>
      </div>
      <div className="space-y-2">
        {items.map((reminder) => (
          <div
            key={reminder.id}
            className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3 text-sm"
          >
            <div>
              <p className="font-medium">{reminder.title}</p>
              <p className="text-xs text-muted-foreground">
                {formatIstDateTime(reminder.remind_at)} ·{" "}
                {reminder.assigned_profile?.display_name ?? "Unassigned"}
              </p>
              {reminder.notes ? (
                <p className="mt-1 text-muted-foreground">{reminder.notes}</p>
              ) : null}
            </div>
            {reminder.ui_status !== "completed" && reminder.ui_status !== "cancelled" ? (
              <Can permission="reminder.complete">
                <form action={formAction}>
                  <input type="hidden" name="reminderId" value={reminder.id} />
                  <input type="hidden" name="customerId" value={customerId} />
                  <CompleteButton />
                </form>
              </Can>
            ) : null}
          </div>
        ))}
      </div>
      {state.error ? (
        <p className="text-xs text-destructive">{state.error}</p>
      ) : null}
    </div>
  );
}

export function Customer360Reminders({
  customerId,
  reminders,
}: {
  customerId: string;
  reminders: Customer360Data["reminders"];
}) {
  const total =
    reminders.overdue.length +
    reminders.today.length +
    reminders.upcoming.length +
    reminders.completed.length;

  if (total === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reminders yet. Use Add reminder to schedule one.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <ReminderGroup
        title="Overdue"
        tone="destructive"
        customerId={customerId}
        items={reminders.overdue}
      />
      <ReminderGroup
        title="Today"
        tone="secondary"
        customerId={customerId}
        items={reminders.today}
      />
      <ReminderGroup
        title="Upcoming"
        tone="outline"
        customerId={customerId}
        items={reminders.upcoming}
      />
      <ReminderGroup
        title="Completed"
        tone="outline"
        customerId={customerId}
        items={reminders.completed}
      />
    </div>
  );
}
