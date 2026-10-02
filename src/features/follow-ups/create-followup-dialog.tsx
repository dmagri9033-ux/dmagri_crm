"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Can } from "@/components/shared/can";
import {
  FollowupForm,
  type FollowupInquiryOption,
} from "@/features/follow-ups/followup-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/lib/db/customers";

export function CreateFollowupDialog({
  customers,
  inquiries,
  defaultCustomerId,
  defaultInquiryId,
  triggerLabel = "Add follow-up",
  triggerVariant = "default",
  triggerSize = "default",
}: {
  customers: Customer[];
  inquiries: FollowupInquiryOption[];
  defaultCustomerId?: string;
  defaultInquiryId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary" | "ghost";
  triggerSize?: "default" | "sm";
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="followup.create">
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
            <DialogTitle>Add follow-up</DialogTitle>
            <DialogDescription>
              Appends a new history row for this customer. Previous follow-ups stay
              unchanged.
            </DialogDescription>
          </DialogHeader>
          <FollowupForm
            mode="create"
            customers={customers}
            inquiries={inquiries}
            defaultCustomerId={defaultCustomerId}
            defaultInquiryId={defaultInquiryId}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
