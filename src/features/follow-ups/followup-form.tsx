"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createFollowupAction,
  updateFollowupAction,
  type FollowupActionState,
} from "@/actions/followups";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Customer } from "@/lib/db/customers";
import type { FollowupWithRelations } from "@/lib/db/followups";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export type FollowupInquiryOption = {
  id: string;
  inquiry_date: string;
  product_name_snapshot: string | null;
  customer_id: string;
};

type FollowupFormProps = {
  mode: "create" | "edit";
  followup?: FollowupWithRelations;
  customers: Customer[];
  inquiries: FollowupInquiryOption[];
  defaultCustomerId?: string;
  defaultInquiryId?: string;
  onSuccess?: () => void;
};

export function FollowupForm({
  mode,
  followup,
  customers,
  inquiries,
  defaultCustomerId,
  defaultInquiryId,
  onSuccess,
}: FollowupFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createFollowupAction : updateFollowupAction;
  const [state, formAction] = useActionState<FollowupActionState, FormData>(action, {});
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState(
    followup?.customer_id ?? defaultCustomerId ?? "",
  );

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

  const inquiryOptions = useMemo(() => {
    const list = inquiries.filter((i) => i.customer_id === customerId);
    if (
      followup?.inquiries &&
      followup.inquiries.customer_id === customerId &&
      !list.some((i) => i.id === followup.inquiries?.id)
    ) {
      list.unshift(followup.inquiries);
    }
    return list;
  }, [inquiries, customerId, followup]);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [state.success, onSuccess, router]);

  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  return (
    <form action={formAction} className="space-y-4">
      {followup ? <input type="hidden" name="followupId" value={followup.id} /> : null}

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

      <p className="text-xs text-muted-foreground">
        Each follow-up is a new history entry — edit corrects this row only; add again
        for a new conversation.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="followup_date">Date</Label>
          <Input
            id="followup_date"
            name="followup_date"
            type="date"
            required
            defaultValue={followup?.followup_date ?? today}
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="customer_search">Customer</Label>
          {mode === "create" && !defaultCustomerId ? (
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
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Select customer</option>
            {mode === "edit" && followup?.customers ? (
              <option value={followup.customers.id}>
                {followup.customers.name} · {followup.customers.mobile}
              </option>
            ) : null}
            {defaultCustomerId &&
            !filteredCustomers.some((c) => c.id === defaultCustomerId) &&
            !followup?.customers
              ? customers
                  .filter((c) => c.id === defaultCustomerId)
                  .map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} · {customer.mobile}
                    </option>
                  ))
              : null}
            {filteredCustomers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} · {customer.mobile}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="inquiry_id">Related inquiry (optional)</Label>
          <select
            id="inquiry_id"
            name="inquiry_id"
            defaultValue={followup?.inquiry_id ?? defaultInquiryId ?? ""}
            key={`${customerId}-${followup?.inquiry_id ?? defaultInquiryId ?? ""}`}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            disabled={!customerId}
          >
            <option value="">None</option>
            {inquiryOptions.map((inquiry) => (
              <option key={inquiry.id} value={inquiry.id}>
                {inquiry.inquiry_date} ·{" "}
                {inquiry.product_name_snapshot || "Inquiry"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={4}
          required
          defaultValue={followup?.notes ?? ""}
          placeholder="What was discussed / next step…"
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton label={mode === "create" ? "Add follow-up" : "Save changes"} />
      </div>
    </form>
  );
}
