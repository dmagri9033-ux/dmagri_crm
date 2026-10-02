"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import type { UserRoleLite } from "@/lib/db/users";

export function CreateUserDialog({ roles }: { roles: UserRoleLite[] }) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="user.create">
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add user
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create user</DialogTitle>
            <DialogDescription>
              Creates a Supabase Auth account and CRM profile with the selected
              role.
            </DialogDescription>
          </DialogHeader>
          <UserForm
            mode="create"
            roles={roles}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
