"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createRoleAction,
  updateRoleAction,
  type RoleActionState,
} from "@/actions/roles";
import { PermissionCheckboxGroup } from "@/features/roles/permission-checkbox-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { PermissionCode } from "@/lib/rbac/permissions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

type RoleFormProps = {
  mode: "create" | "edit";
  roleId?: string;
  initialName?: string;
  initialDescription?: string | null;
  initialPermissionCodes?: PermissionCode[];
  isSystem?: boolean;
  onSuccess?: () => void;
};

export function RoleForm({
  mode,
  roleId,
  initialName = "",
  initialDescription = "",
  initialPermissionCodes = [],
  isSystem = false,
  onSuccess,
}: RoleFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createRoleAction : updateRoleAction;
  const [state, formAction] = useActionState<RoleActionState, FormData>(action, {});
  const [permissionCodes, setPermissionCodes] = useState<PermissionCode[]>(
    initialPermissionCodes,
  );

  useEffect(() => {
    setPermissionCodes(initialPermissionCodes);
  }, [initialPermissionCodes]);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      if (mode === "create" && state.roleId) {
        router.push(`/roles/${state.roleId}`);
      } else {
        router.refresh();
      }
    }
  }, [state.success, state.roleId, mode, onSuccess, router]);

  const formKey = `${roleId ?? "new"}|${initialName}|${initialDescription ?? ""}|${initialPermissionCodes.join(",")}`;

  return (
    <form key={formKey} action={formAction} className="space-y-6">
      {roleId ? <input type="hidden" name="roleId" value={roleId} /> : null}

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Role name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={initialName}
            disabled={isSystem}
            placeholder="e.g. Sales Manager"
          />
          {isSystem ? (
            <p className="text-xs text-muted-foreground">
              System role name cannot be changed.
            </p>
          ) : null}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            name="description"
            defaultValue={initialDescription ?? ""}
            placeholder="Optional description"
            rows={2}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Permissions</Label>
        <PermissionCheckboxGroup
          value={permissionCodes}
          onChange={setPermissionCodes}
        />
      </div>

      <div className="flex justify-end gap-2">
        <SubmitButton label={mode === "create" ? "Create role" : "Save changes"} />
      </div>
    </form>
  );
}
