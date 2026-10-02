"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import type { ProfileLite } from "@/lib/db/reminders";

export function CreateReminderDialog({
  customers,
  inquiries,
  assignees,
  defaultCustomerId,
  defaultInquiryId,
  defaultAssigneeId,
  triggerLabel = "Add reminder",
  triggerVariant = "default",
  triggerSize = "default",
}: {
  customers: Customer[];
  inquiries: ReminderInquiryOption[];
  assignees: ProfileLite[];
  defaultCustomerId?: string;
  defaultInquiryId?: string;
  defaultAssigneeId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
  triggerSize?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="reminder.create">
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setOpen(true)}
      >
        {triggerSize === "default" ? <Plus className="size-4" /> : null}
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create reminder</DialogTitle>
            <DialogDescription>
              Schedule a follow-up action. Times use Asia/Kolkata (IST).
            </DialogDescription>
          </DialogHeader>
          <ReminderForm
            mode="create"
            customers={customers}
            inquiries={inquiries}
            assignees={assignees}
            defaultCustomerId={defaultCustomerId}
            defaultInquiryId={defaultInquiryId}
            defaultAssigneeId={defaultAssigneeId}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
