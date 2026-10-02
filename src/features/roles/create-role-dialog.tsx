"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Can } from "@/components/shared/can";
import { RoleForm } from "@/features/roles/role-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="role.create">
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add role
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create role</DialogTitle>
            <DialogDescription>
              Define a role name and select granular permissions.
            </DialogDescription>
          </DialogHeader>
          <RoleForm mode="create" onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
