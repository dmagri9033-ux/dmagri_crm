"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Trash2 } from "lucide-react";
import { deleteCustomerAction, type CustomerActionState } from "@/actions/customers";
import { Can } from "@/components/shared/can";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="icon-sm"
      variant="ghost"
      className="bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
      disabled={pending}
      title={pending ? "Deleting…" : "Delete"}
      aria-label={pending ? "Deleting…" : "Delete"}
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}

export function DeleteCustomerButton({
  customerId,
  customerName,
  redirectToList = false,
}: {
  customerId: string;
  customerName: string;
  redirectToList?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<CustomerActionState, FormData>(
    deleteCustomerAction,
    {},
  );

  useEffect(() => {
    if (state.success) {
      if (redirectToList) router.push("/customers");
      router.refresh();
    }
  }, [state.success, redirectToList, router]);

  return (
    <Can permission="customer.delete">
      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              `Delete customer "${customerName}"? Historical inquiries remain linked.`,
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="customerId" value={customerId} />
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
