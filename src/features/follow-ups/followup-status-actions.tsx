"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { CheckCircle2, RotateCcw } from "lucide-react";
import {
  completeFollowupAction,
  reopenFollowupAction,
  type FollowupActionState,
} from "@/actions/followups";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";

function ActionButton({
  label,
  className,
  icon,
}: {
  label: string;
  className: string;
  icon: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="icon-sm"
      variant="ghost"
      className={className}
      disabled={pending}
      title={pending ? "…" : label}
      aria-label={pending ? "…" : label}
    >
      {pending ? <span className="text-[10px]">…</span> : icon}
    </Button>
  );
}

export function FollowupStatusActions({
  followupId,
  completed,
  onCompleted,
  onReopened,
}: {
  followupId: string;
  completed: boolean;
  onCompleted?: (id: string) => void;
  onReopened?: (id: string) => void;
}) {
  const router = useRouter();
  const [completeState, completeAction] = useActionState<
    FollowupActionState,
    FormData
  >(completeFollowupAction, {});
  const [reopenState, reopenAction] = useActionState<
    FollowupActionState,
    FormData
  >(reopenFollowupAction, {});

  useEffect(() => {
    if (completeState.success) {
      onCompleted?.(followupId);
      router.refresh();
    }
  }, [completeState.success, followupId, onCompleted, router]);

  useEffect(() => {
    if (reopenState.success) {
      onReopened?.(followupId);
      router.refresh();
    }
  }, [reopenState.success, followupId, onReopened, router]);

  const error = completeState.error || reopenState.error;

  return (
    <>
      {!completed ? (
        <Can permission="followup.update">
          <form action={completeAction}>
            <input type="hidden" name="followupId" value={followupId} />
            <ActionButton
              label="Complete"
              icon={<CheckCircle2 className="size-3.5" />}
              className="bg-emerald-500/10 text-emerald-800 hover:bg-emerald-500/20 hover:text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 dark:hover:text-emerald-200"
            />
          </form>
        </Can>
      ) : (
        <Can permission="followup.update">
          <form action={reopenAction}>
            <input type="hidden" name="followupId" value={followupId} />
            <ActionButton
              label="Reopen"
              icon={<RotateCcw className="size-3.5" />}
              className="bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 hover:text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30 dark:hover:text-amber-100"
            />
          </form>
        </Can>
      )}
      {error ? (
        <p className="max-w-[10rem] text-[10px] text-destructive">{error}</p>
      ) : null}
    </>
  );
}
