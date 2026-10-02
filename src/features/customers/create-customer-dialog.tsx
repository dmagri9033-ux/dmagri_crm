"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
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
import type { Product } from "@/lib/db/products";

export function CreateCustomerDialog({ products }: { products: Product[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <Can permission="customer.create">
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add customer
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create customer</DialogTitle>
            <DialogDescription>
              Duplicate mobile numbers are blocked. You can update the existing
              record instead.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm
            mode="create"
            products={products}
            onSuccess={(customerId) => {
              setOpen(false);
              if (customerId) router.push(`/customers/${customerId}`);
            }}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
