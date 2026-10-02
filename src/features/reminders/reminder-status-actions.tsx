"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  completeReminderAction,
  reopenReminderAction,
  type ReminderActionState,
} from "@/actions/reminders";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";
import type { ReminderWithRelations } from "@/lib/db/reminders";

function ActionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function ReminderStatusActions({
  reminder,
  onSuccess,
}: {
  reminder: ReminderWithRelations;
  onSuccess?: () => void;
}) {
  const router = useRouter();
  const [completeState, completeAction] = useActionState<
    ReminderActionState,
    FormData
  >(completeReminderAction, {});
  const [reopenState, reopenAction] = useActionState<ReminderActionState, FormData>(
    reopenReminderAction,
    {},
  );

  useEffect(() => {
    if (completeState.success || reopenState.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [completeState.success, reopenState.success, router, onSuccess]);

  const isClosed =
    reminder.ui_status === "completed" || reminder.ui_status === "cancelled";

  return (
    <div className="flex flex-wrap gap-2">
      {!isClosed ? (
        <Can permission="reminder.complete">
          <form action={completeAction}>
            <input type="hidden" name="reminderId" value={reminder.id} />
            <ActionButton label="Complete" />
          </form>
        </Can>
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
    </div>
  );
}
