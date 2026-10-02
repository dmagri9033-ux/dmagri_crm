"use client";

import { useState } from "react";
import { Can } from "@/components/shared/can";
import { CustomerForm } from "@/features/customers/customer-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { CustomerWithProduct } from "@/lib/db/customers";
import type { Product } from "@/lib/db/products";

export function EditCustomerDialog({
  customer,
  products,
}: {
  customer: CustomerWithProduct;
  products: Product[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="customer.update">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit customer</DialogTitle>
            <DialogDescription>
              Mobile numbers must stay unique across active customers.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            mode="edit"
            customer={customer}
            products={products}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
