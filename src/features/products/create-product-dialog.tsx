"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Can } from "@/components/shared/can";
import { ProductForm } from "@/features/products/product-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateProductDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="product.create">
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add product
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create product</DialogTitle>
            <DialogDescription>
              Only active products appear in new inquiry and customer forms.
            </DialogDescription>
          </DialogHeader>
          <ProductForm mode="create" onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
