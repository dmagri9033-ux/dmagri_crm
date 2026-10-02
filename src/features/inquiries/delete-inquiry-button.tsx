"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { deleteInquiryAction, type InquiryActionState } from "@/actions/inquiries";
import { Can } from "@/components/shared/can";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="destructive" disabled={pending}>
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}

export function DeleteInquiryButton({
  inquiryId,
  label,
}: {
  inquiryId: string;
  label: string;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<InquiryActionState, FormData>(
    deleteInquiryAction,
    {},
  );

  useEffect(() => {
    if (state.success) router.refresh();
  }, [state.success, router]);

  return (
    <Can permission="inquiry.delete">
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(`Delete inquiry for "${label}"?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="inquiryId" value={inquiryId} />
        {state.error ? (
          <Alert variant="destructive" className="mb-2">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        <DeleteButton />
      </form>
    </Can>
  );
}
