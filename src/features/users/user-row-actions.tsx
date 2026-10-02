"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  deleteUserAction,
  resetUserPasswordAction,
  setUserActiveAction,
  type UserActionState,
} from "@/actions/users";
import { Can } from "@/components/shared/can";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { UserRow } from "@/lib/db/users";

function ActionButton({
  label,
  variant = "outline",
}: {
  label: string;
  variant?: "outline" | "destructive" | "secondary";
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant={variant} disabled={pending}>
      {pending ? "…" : label}
    </Button>
  );
}

export function UserRowActions({ user }: { user: UserRow }) {
  const router = useRouter();
  const [toggleState, toggleAction] = useActionState<UserActionState, FormData>(
    setUserActiveAction,
    {},
  );
  const [resetState, resetAction] = useActionState<UserActionState, FormData>(
    resetUserPasswordAction,
    {},
  );
  const [deleteState, deleteAction] = useActionState<UserActionState, FormData>(
    deleteUserAction,
    {},
  );

  useEffect(() => {
    if (toggleState.success || resetState.success || deleteState.success) {
      router.refresh();
    }
  }, [
    toggleState.success,
    resetState.success,
    deleteState.success,
    router,
  ]);

  const error = toggleState.error || resetState.error || deleteState.error;
  const success = resetState.success;

  return (
    <div className="flex flex-col items-end gap-2">
      {error ? (
        <Alert variant="destructive" className="max-w-xs">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {success ? (
        <Alert className="max-w-xs">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2">
        <Can permission="user.update">
          <form action={toggleAction}>
            <input type="hidden" name="userId" value={user.id} />
            <input
              type="hidden"
              name="is_active"
              value={user.is_active ? "false" : "true"}
            />
            <ActionButton
              label={user.is_active ? "Deactivate" : "Activate"}
              variant="secondary"
            />
          </form>
        </Can>

        <Can permission="user.reset_password">
          <form
            action={resetAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Send a password reset email to ${user.email}?`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="userId" value={user.id} />
            <ActionButton label="Reset password" variant="outline" />
          </form>
        </Can>

        <Can permission="user.delete">
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Soft-delete "${user.display_name}"? They will no longer be able to sign in.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="userId" value={user.id} />
            <ActionButton label="Delete" variant="destructive" />
          </form>
        </Can>
      </div>
    </div>
  );
}
