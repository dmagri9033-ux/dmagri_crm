"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createUserAction,
  updateUserAction,
  type UserActionState,
} from "@/actions/users";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { UserRoleLite } from "@/lib/db/users";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

type UserFormProps = {
  mode: "create" | "edit";
  userId?: string;
  roles: UserRoleLite[];
  initialDisplayName?: string;
  initialEmail?: string;
  initialRoleId?: string;
  initialActive?: boolean;
  onSuccess?: () => void;
};

export function UserForm({
  mode,
  userId,
  roles,
  initialDisplayName = "",
  initialEmail = "",
  initialRoleId = "",
  initialActive = true,
  onSuccess,
}: UserFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createUserAction : updateUserAction;
  const [state, formAction] = useActionState<UserActionState, FormData>(
    action,
    {},
  );
  const [isActive, setIsActive] = useState(initialActive);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [state.success, onSuccess, router]);

  return (
    <form action={formAction} className="space-y-4">
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />

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

      <div className="space-y-2">
        <Label htmlFor="display_name">Display name</Label>
        <Input
          id="display_name"
          name="display_name"
          required
          defaultValue={initialDisplayName}
          placeholder="e.g. Priya Sharma"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          defaultValue={initialEmail}
          placeholder="user@example.com"
          autoComplete="off"
        />
      </div>

      {mode === "create" ? (
        <div className="space-y-2">
          <Label htmlFor="password">Temporary password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            Share this with the user. They can change it via forgot password.
          </p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="role_id">Role</Label>
        <select
          id="role_id"
          name="role_id"
          required
          defaultValue={initialRoleId}
          className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Select a role…
          </option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
              {role.is_system ? " (system)" : ""}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <span>Active (can sign in)</span>
      </label>

      <div className="flex justify-end">
        <SubmitButton label={mode === "create" ? "Create user" : "Save changes"} />
      </div>
    </form>
  );
}
