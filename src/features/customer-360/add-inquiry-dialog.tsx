"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  addInquiryQuickAction,
  type Customer360ActionState,
} from "@/actions/customer-360";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/db/products";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : "Add inquiry"}
    </Button>
  );
}

export function AddInquiryDialog({
  customerId,
  customerType,
  products,
}: {
  customerId: string;
  customerType: string | null;
  products: Product[];
}) {
  const [open, setOpen] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const router = useRouter();
  const [state, formAction] = useActionState<Customer360ActionState, FormData>(
    addInquiryQuickAction,
    {},
  );

  useEffect(() => {
    if (state.success) {
      setOpen(false);
      setPurchased(false);
      router.refresh();
    }
  }, [state.success, router]);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return (
    <>
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        Add inquiry
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add inquiry</DialogTitle>
          </DialogHeader>
          <form action={formAction} className="space-y-3">
            <input type="hidden" name="customerId" value={customerId} />
            <input type="hidden" name="customerType" value={customerType ?? ""} />
            <input type="hidden" name="productPurchased" value={purchased ? "true" : "false"} />
            {state.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="inquiryDate">Date</Label>
              <Input id="inquiryDate" name="inquiryDate" type="date" required defaultValue={today} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="productId">Product</Label>
              <select
                id="productId"
                name="productId"
                required
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              >
                <option value="">Select product</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={purchased}
                onCheckedChange={(checked) => setPurchased(checked === true)}
              />
              Product purchased
            </label>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea id="remarks" name="remarks" rows={2} />
            </div>
            <div className="flex justify-end">
              <SubmitButton />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
