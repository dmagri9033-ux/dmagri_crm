"use client";

import { useState } from "react";
import { Can } from "@/components/shared/can";
import {
  ReminderForm,
  type ReminderInquiryOption,
} from "@/features/reminders/reminder-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/lib/db/customers";
import type { ProfileLite, ReminderWithRelations } from "@/lib/db/reminders";

export function EditReminderDialog({
  reminder,
  customers,
  inquiries,
  assignees,
}: {
  reminder: ReminderWithRelations;
  customers: Customer[];
  inquiries: ReminderInquiryOption[];
  assignees: ProfileLite[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="reminder.update">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit reminder</DialogTitle>
            <DialogDescription>
              Changing the remind time clears an active snooze.
            </DialogDescription>
          </DialogHeader>
          <ReminderForm
            mode="edit"
            reminder={reminder}
            customers={customers}
            inquiries={inquiries}
            assignees={assignees}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
