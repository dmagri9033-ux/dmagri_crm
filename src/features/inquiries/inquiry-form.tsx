"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createInquiryAction,
  updateInquiryAction,
  type InquiryActionState,
} from "@/actions/inquiries";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { InquiryWithRelations } from "@/lib/db/inquiries";
import type { Product } from "@/lib/db/products";
import type { Customer } from "@/lib/db/customers";
import { CUSTOMER_TYPES } from "@/validations/customer";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

type InquiryFormProps = {
  mode: "create" | "edit";
  inquiry?: InquiryWithRelations;
  customers: Customer[];
  products: Product[];
  defaultCustomerId?: string;
  onSuccess?: () => void;
};

export function InquiryForm({
  mode,
  inquiry,
  customers,
  products,
  defaultCustomerId,
  onSuccess,
}: InquiryFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createInquiryAction : updateInquiryAction;
  const [state, formAction] = useActionState<InquiryActionState, FormData>(action, {});
  const [purchased, setPurchased] = useState(inquiry?.product_purchased ?? false);
  const [customerSearch, setCustomerSearch] = useState("");

  const productOptions = useMemo(() => {
    const list = [...products];
    if (
      inquiry?.products &&
      !list.some((p) => p.id === inquiry.products?.id)
    ) {
      list.unshift({
        id: inquiry.products.id,
        name: inquiry.products.name,
        is_active: inquiry.products.is_active,
        created_at: inquiry.created_at,
        updated_at: inquiry.updated_at,
        deleted_at: null,
      });
    }
    return list;
  }, [products, inquiry]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 100);
    return customers
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.mobile.includes(q) ||
          c.mobile_normalized.includes(q),
      )
      .slice(0, 100);
  }, [customers, customerSearch]);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [state.success, onSuccess, router]);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return (
    <form action={formAction} className="space-y-4">
      {inquiry ? <input type="hidden" name="inquiryId" value={inquiry.id} /> : null}
      <input
        type="hidden"
        name="product_purchased"
        value={purchased ? "true" : "false"}
      />

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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inquiry_date">Date</Label>
          <Input
            id="inquiry_date"
            name="inquiry_date"
            type="date"
            required
            defaultValue={inquiry?.inquiry_date ?? today}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_type">Customer type</Label>
          <select
            id="customer_type"
            name="customer_type"
            defaultValue={inquiry?.customer_type ?? ""}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">From customer / none</option>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="customer_search">Customer</Label>
          {mode === "create" ? (
            <Input
              id="customer_search"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Filter customers by name or mobile…"
              className="mb-2"
            />
          ) : null}
          <select
            id="customer_id"
            name="customer_id"
            required
            defaultValue={inquiry?.customer_id ?? defaultCustomerId ?? ""}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Select customer</option>
            {mode === "edit" && inquiry?.customers ? (
              <option value={inquiry.customers.id}>
                {inquiry.customers.name} · {inquiry.customers.mobile}
              </option>
            ) : null}
            {filteredCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} · {customer.mobile}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="product_id">Product</Label>
          <select
            id="product_id"
            name="product_id"
            required
            defaultValue={inquiry?.product_id ?? ""}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Select product</option>
            {productOptions.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
                {!product.is_active ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={purchased}
          onCheckedChange={(checked) => setPurchased(checked === true)}
        />
        Product purchased
      </label>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks / follow-up notes</Label>
        <Textarea
          id="remarks"
          name="remarks"
          rows={3}
          defaultValue={inquiry?.remarks ?? ""}
          placeholder="Optional remarks"
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton label={mode === "create" ? "Create inquiry" : "Save changes"} />
      </div>
    </form>
  );
}
