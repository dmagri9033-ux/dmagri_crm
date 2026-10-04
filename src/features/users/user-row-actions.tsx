"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  deleteUserAction,
  resetUserPasswordAction,
  type UserActionState,
} from "@/actions/users";
import { Can } from "@/components/shared/can";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { UserRow } from "@/lib/db/users";

function ActionButton({
  label,
  variant = "outline",
  className,
}: {
  label: string;
  variant?: "outline" | "destructive" | "secondary" | "ghost";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      className={className}
      disabled={pending}
    >
      {pending ? "…" : label}
    </Button>
  );
}

export function UserRowActions({
  user,
  onDeleted,
  readOnly = false,
}: {
  user: UserRow;
  onDeleted?: (id: string) => void;
  /** Hide mutating actions (e.g. Administrator accounts). */
  readOnly?: boolean;
}) {
  if (readOnly) {
    return (
      <p className="text-[10px] text-muted-foreground">Read-only</p>
    );
  }
  const router = useRouter();
  const [resetState, resetAction] = useActionState<UserActionState, FormData>(
    resetUserPasswordAction,
    {},
  );
  const [deleteState, deleteAction] = useActionState<UserActionState, FormData>(
    deleteUserAction,
    {},
  );

  useEffect(() => {
    if (deleteState.success && onDeleted) {
      onDeleted(user.id);
      return;
    }
    if (resetState.success || deleteState.success) {
      router.refresh();
    }
  }, [
    deleteState.success,
    resetState.success,
    onDeleted,
    user.id,
    router,
  ]);

  const error = resetState.error || deleteState.error;
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
            <ActionButton
              label="Reset password"
              variant="ghost"
              className="bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 hover:text-amber-950 dark:bg-amber-500/20 dark:text-amber-200 dark:hover:bg-amber-500/30 dark:hover:text-amber-100"
            />
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
