"use client";

import { useState } from "react";
import { Can } from "@/components/shared/can";
import { InquiryForm } from "@/features/inquiries/inquiry-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/lib/db/customers";
import type { InquiryWithRelations } from "@/lib/db/inquiries";
import type { Product } from "@/lib/db/products";

export function EditInquiryDialog({
  inquiry,
  customers,
  products,
}: {
  inquiry: InquiryWithRelations;
  customers: Customer[];
  products: Product[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="inquiry.update">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit inquiry</DialogTitle>
            <DialogDescription>
              Updating purchase status syncs purchased-product history.
            </DialogDescription>
          </DialogHeader>
          <InquiryForm
            mode="edit"
            inquiry={inquiry}
            customers={customers}
            products={products}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
