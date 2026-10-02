"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { deleteRoleAction, type RoleActionState } from "@/actions/roles";
import { Can } from "@/components/shared/can";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

function DeleteButton({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={disabled || pending}>
      {pending ? "Deleting…" : "Delete role"}
    </Button>
  );
}

export function DeleteRoleButton({
  roleId,
  isSystem,
  userCount,
}: {
  roleId: string;
  isSystem: boolean;
  userCount: number;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState<RoleActionState, FormData>(
    deleteRoleAction,
    {},
  );

  useEffect(() => {
    if (state.success) {
      router.push("/roles");
      router.refresh();
    }
  }, [state.success, router]);

  const blocked = isSystem || userCount > 0;

  return (
    <Can permission="role.delete">
      <form
        action={formAction}
        className="space-y-3"
        onSubmit={(event) => {
          if (blocked) {
            event.preventDefault();
            return;
          }
          if (!window.confirm("Delete this role? This cannot be undone easily.")) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="roleId" value={roleId} />
        {state.error ? (
          <Alert variant="destructive">
            <AlertDescription>{state.error}</AlertDescription>
          </Alert>
        ) : null}
        {isSystem ? (
          <p className="text-xs text-muted-foreground">System roles cannot be deleted.</p>
        ) : null}
        {!isSystem && userCount > 0 ? (
          <p className="text-xs text-muted-foreground">
            Reassign {userCount} user(s) before deleting this role.
          </p>
        ) : null}
        <DeleteButton disabled={blocked} />
      </form>
    </Can>
  );
}
