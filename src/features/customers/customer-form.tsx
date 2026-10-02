"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createCustomerAction,
  updateCustomerAction,
  type CustomerActionState,
} from "@/actions/customers";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Product } from "@/lib/db/products";
import type { CustomerWithProduct } from "@/lib/db/customers";
import { CUSTOMER_TYPES } from "@/validations/customer";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

type CustomerFormProps = {
  mode: "create" | "edit";
  customer?: CustomerWithProduct;
  products: Product[];
  onSuccess?: (customerId?: string) => void;
};

export function CustomerForm({
  mode,
  customer,
  products,
  onSuccess,
}: CustomerFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createCustomerAction : updateCustomerAction;
  const [state, formAction] = useActionState<CustomerActionState, FormData>(
    action,
    {},
  );
  const [purchased, setPurchased] = useState(customer?.product_purchased ?? false);
  const [followUp, setFollowUp] = useState(customer?.follow_up_required ?? false);
  const [updateExisting, setUpdateExisting] = useState(false);

  // Include inactive current product in edit picker so historical selection stays visible
  const productOptions = [...products];
  if (
    customer?.products &&
    !productOptions.some((p) => p.id === customer.products?.id)
  ) {
    productOptions.unshift({
      id: customer.products.id,
      name: `${customer.products.name} (inactive)`,
      is_active: customer.products.is_active,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
      deleted_at: null,
    });
  }

  useEffect(() => {
    if (state.success) {
      onSuccess?.(state.customerId);
      router.refresh();
    }
  }, [state.success, state.customerId, onSuccess, router]);

  useEffect(() => {
    if (!state.duplicate) {
      setUpdateExisting(false);
    }
  }, [state.duplicate]);

  return (
    <form action={formAction} className="space-y-4">
      {customer ? (
        <input type="hidden" name="customerId" value={customer.id} />
      ) : null}
      <input
        type="hidden"
        name="product_purchased"
        value={purchased ? "true" : "false"}
      />
      <input
        type="hidden"
        name="follow_up_required"
        value={followUp ? "true" : "false"}
      />
      {updateExisting && state.duplicate ? (
        <>
          <input type="hidden" name="updateExisting" value="true" />
          <input type="hidden" name="existingCustomerId" value={state.duplicate.id} />
        </>
      ) : null}

      {state.error && !state.duplicate ? (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {state.duplicate ? (
        <Alert variant="destructive">
          <AlertDescription>
            <p className="font-medium">Duplicate mobile detected</p>
            <p className="mt-1">
              Existing customer: {state.duplicate.name} ({state.duplicate.mobile})
            </p>
            {mode === "create" ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setUpdateExisting(true)}
                >
                  Update existing instead
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setUpdateExisting(false);
                    router.push(`/customers/${state.duplicate!.id}`);
                  }}
                >
                  Open existing
                </Button>
              </div>
            ) : null}
            {mode === "create" && updateExisting ? (
              <p className="mt-2 text-xs">
                Click save again to update the existing customer with these values.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      {state.success ? (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="name">Customer name</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={customer?.name ?? ""}
            placeholder="Full name"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile number</Label>
          <Input
            id="mobile"
            name="mobile"
            required
            defaultValue={customer?.mobile ?? ""}
            placeholder="10-digit mobile"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_type">Customer type</Label>
          <select
            id="customer_type"
            name="customer_type"
            defaultValue={customer?.customer_type ?? ""}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">Select type</option>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="primary_product_id">Product</Label>
          <select
            id="primary_product_id"
            name="primary_product_id"
            defaultValue={customer?.primary_product_id ?? ""}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="">No product</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {!product.is_active ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={purchased}
            onCheckedChange={(checked) => setPurchased(checked === true)}
          />
          Product purchased
        </label>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={followUp}
            onCheckedChange={(checked) => setFollowUp(checked === true)}
          />
          Follow-up required
        </label>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={customer?.notes ?? ""}
          placeholder="Optional notes"
        />
      </div>

      <div className="flex justify-end gap-2">
        <SubmitButton
          label={
            mode === "create"
              ? updateExisting
                ? "Update existing customer"
                : "Create customer"
              : "Save changes"
          }
        />
      </div>
    </form>
  );
}
