"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createProductAction,
  updateProductAction,
  type ProductActionState,
} from "@/actions/products";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

type ProductFormProps = {
  mode: "create" | "edit";
  productId?: string;
  initialName?: string;
  initialActive?: boolean;
  onSuccess?: () => void;
};

export function ProductForm({
  mode,
  productId,
  initialName = "",
  initialActive = true,
  onSuccess,
}: ProductFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createProductAction : updateProductAction;
  const [state, formAction] = useActionState<ProductActionState, FormData>(
    action,
    {},
  );
  const [isActive, setIsActive] = useState(initialActive);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [state.success, onSuccess, router]);

  return (
    <form action={formAction} className="space-y-4">
      {productId ? <input type="hidden" name="productId" value={productId} /> : null}
      <input type="hidden" name="is_active" value={isActive ? "true" : "false"} />

      {state.error ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}
      {state.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="name">Product name</Label>
        <Input
          id="name"
          name="name"
          required
          defaultValue={initialName}
          placeholder="e.g. Organic Fertilizer"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={isActive}
          onCheckedChange={(checked) => setIsActive(checked === true)}
        />
        <span>Active (selectable in new inquiries/customers)</span>
      </label>

      <div className="flex justify-end">
        <SubmitButton label={mode === "create" ? "Create product" : "Save changes"} />
      </div>
    </form>
  );
}
