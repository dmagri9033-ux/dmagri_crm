"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
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
import type { Product } from "@/lib/db/products";

export function CreateInquiryDialog({
  customers,
  products,
}: {
  customers: Customer[];
  products: Product[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="inquiry.create">
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add inquiry
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create inquiry</DialogTitle>
            <DialogDescription>
              Links a customer and product. Purchased inquiries sync to Customer 360°.
            </DialogDescription>
          </DialogHeader>
          <InquiryForm
            mode="create"
            customers={customers}
            products={products}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
