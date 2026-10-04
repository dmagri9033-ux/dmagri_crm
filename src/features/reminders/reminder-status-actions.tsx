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

function ActionButton({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant="ghost"
      className={className}
      disabled={pending}
    >
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
            <ActionButton
              label="Complete"
              className="bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 hover:text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 dark:hover:text-emerald-200"
            />
          </form>
        </Can>
      ) : (
        <Can permission="reminder.update">
          <form action={reopenAction}>
            <input type="hidden" name="reminderId" value={reminder.id} />
            <ActionButton
              label="Reopen"
              className="bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 hover:text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30 dark:hover:text-amber-100"
            />
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
