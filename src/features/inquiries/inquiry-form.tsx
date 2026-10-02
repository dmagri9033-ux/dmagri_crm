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
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
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

  const defaultCustomer =
    inquiry?.customers ??
    customers.find((c) => c.id === (inquiry?.customer_id ?? defaultCustomerId)) ??
    null;

  const [mobile, setMobile] = useState(
    inquiry?.mobile_snapshot || defaultCustomer?.mobile || "",
  );
  const [customerName, setCustomerName] = useState(
    inquiry?.customer_name_snapshot || defaultCustomer?.name || "",
  );

  const matchedCustomer = useMemo(() => {
    const normalized = normalizeMobile(mobile);
    if (!normalized) return null;
    return (
      customers.find((c) => c.mobile_normalized === normalized) ?? null
    );
  }, [customers, mobile]);

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

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [state.success, onSuccess, router]);

  useEffect(() => {
    if (matchedCustomer && !customerName.trim()) {
      setCustomerName(matchedCustomer.name);
    }
  }, [matchedCustomer, customerName]);

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

      <div className="space-y-2">
        <Label htmlFor="mobile">
          Customer number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="mobile"
          name="mobile"
          required
          inputMode="tel"
          autoComplete="tel"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          placeholder="10-digit mobile number"
        />
        <p className="text-xs text-muted-foreground">
          {matchedCustomer
            ? `Matched existing customer: ${matchedCustomer.name}`
            : mobile.trim()
              ? "No customer with this number yet — a new customer will be created on save."
              : "Only the mobile number is required. New numbers create a customer automatically."}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer_name">Customer name (optional)</Label>
        <Input
          id="customer_name"
          name="customer_name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          placeholder={
            matchedCustomer
              ? matchedCustomer.name
              : "Used when creating a new customer"
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inquiry_date">Date (optional)</Label>
          <Input
            id="inquiry_date"
            name="inquiry_date"
            type="date"
            defaultValue={inquiry?.inquiry_date ?? today}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer_type">Customer type (optional)</Label>
          <select
            id="customer_type"
            name="customer_type"
            defaultValue={inquiry?.customer_type ?? defaultCustomer?.customer_type ?? ""}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">None</option>
            {CUSTOMER_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="product_id">Product (optional)</Label>
          <select
            id="product_id"
            name="product_id"
            defaultValue={inquiry?.product_id ?? ""}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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

      <label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={purchased}
          onCheckedChange={(checked) => setPurchased(checked === true)}
        />
        Product purchased
      </label>

      <div className="space-y-2">
        <Label htmlFor="remarks">Remarks / follow-up notes (optional)</Label>
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
