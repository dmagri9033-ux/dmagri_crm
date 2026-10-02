"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  completeInquiryAction,
  reopenInquiryAction,
  type InquiryActionState,
} from "@/actions/inquiries";
import { Can } from "@/components/shared/can";
import { Button } from "@/components/ui/button";

function ActionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function InquiryStatusActions({
  inquiryId,
  completed,
  onCompleted,
  onReopened,
}: {
  inquiryId: string;
  completed: boolean;
  onCompleted?: (id: string) => void;
  onReopened?: (id: string) => void;
}) {
  const router = useRouter();
  const [completeState, completeAction] = useActionState<
    InquiryActionState,
    FormData
  >(completeInquiryAction, {});
  const [reopenState, reopenAction] = useActionState<InquiryActionState, FormData>(
    reopenInquiryAction,
    {},
  );

  useEffect(() => {
    if (completeState.success) {
      onCompleted?.(inquiryId);
      router.refresh();
    }
  }, [completeState.success, inquiryId, onCompleted, router]);

  useEffect(() => {
    if (reopenState.success) {
      onReopened?.(inquiryId);
      router.refresh();
    }
  }, [reopenState.success, inquiryId, onReopened, router]);

  const error = completeState.error || reopenState.error;

  return (
    <div className="flex flex-col items-end gap-1">
      {!completed ? (
        <Can permission="inquiry.update">
          <form action={completeAction}>
            <input type="hidden" name="inquiryId" value={inquiryId} />
            <ActionButton label="Complete" />
          </form>
        </Can>
      ) : (
        <Can permission="inquiry.update">
          <form action={reopenAction}>
            <input type="hidden" name="inquiryId" value={inquiryId} />
            <ActionButton label="Reopen" />
          </form>
        </Can>
      )}
      {error ? (
        <p className="max-w-[10rem] text-[10px] text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
