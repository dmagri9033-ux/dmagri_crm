"use client";

import { useState } from "react";
import { Can } from "@/components/shared/can";
import { UserForm } from "@/features/users/user-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserRoleLite, UserRow } from "@/lib/db/users";

export function EditUserDialog({
  user,
  roles,
}: {
  user: UserRow;
  roles: UserRoleLite[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="user.update">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>
              Update profile, role, or active status. Email changes sync to Auth.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            mode="edit"
            userId={user.id}
            roles={roles}
            initialDisplayName={user.display_name}
            initialEmail={user.email}
            initialRoleId={user.role_id}
            initialActive={user.is_active}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
