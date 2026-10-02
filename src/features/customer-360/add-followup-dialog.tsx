"use client";

import { useState } from "react";
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
import type { Customer360Inquiry } from "@/lib/db/customer-360";
import type { Customer } from "@/lib/db/customers";

export function AddFollowupDialog({
  customer,
  inquiries,
}: {
  customer: Customer;
  inquiries: Customer360Inquiry[];
}) {
  const [open, setOpen] = useState(false);

  const inquiryOptions: FollowupInquiryOption[] = inquiries.map((inquiry) => ({
    id: inquiry.id,
    inquiry_date: inquiry.inquiry_date,
    product_name_snapshot:
      inquiry.product_name_snapshot || inquiry.products?.name || null,
    customer_id: customer.id,
  }));

  return (
    <>
      <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Add follow-up
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add follow-up</DialogTitle>
            <DialogDescription>
              Adds a new history row. Earlier follow-ups remain in Customer 360°.
            </DialogDescription>
          </DialogHeader>
          <FollowupForm
            mode="create"
            customers={[customer]}
            inquiries={inquiryOptions}
            defaultCustomerId={customer.id}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
