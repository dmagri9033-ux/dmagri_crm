"use client";

import { useState } from "react";
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
import type { FollowupWithRelations } from "@/lib/db/followups";

export function EditFollowupDialog({
  followup,
  customers,
  inquiries,
}: {
  followup: FollowupWithRelations;
  customers: Customer[];
  inquiries: FollowupInquiryOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="followup.update">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit follow-up</DialogTitle>
            <DialogDescription>
              Corrects this history row only. To record a new conversation, add a
              follow-up instead.
            </DialogDescription>
          </DialogHeader>
          <FollowupForm
            mode="edit"
            followup={followup}
            customers={customers}
            inquiries={inquiries}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
