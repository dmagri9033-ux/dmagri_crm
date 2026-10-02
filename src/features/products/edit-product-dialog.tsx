"use client";

import { useState } from "react";
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
import type { Product } from "@/lib/db/products";

export function EditProductDialog({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);

  return (
    <Can permission="product.update">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Edit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit product</DialogTitle>
            <DialogDescription>
              Deactivating keeps historical records intact.
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            mode="edit"
            productId={product.id}
            initialName={product.name}
            initialActive={product.is_active}
            onSuccess={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </Can>
  );
}
