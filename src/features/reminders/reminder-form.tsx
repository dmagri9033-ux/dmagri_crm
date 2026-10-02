"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import {
  createReminderAction,
  updateReminderAction,
  type ReminderActionState,
} from "@/actions/reminders";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toDatetimeLocalIst } from "@/lib/datetime/ist";
import type { Customer } from "@/lib/db/customers";
import type {
  InquiryLite,
  ProfileLite,
  ReminderWithRelations,
} from "@/lib/db/reminders";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </Button>
  );
}

export type ReminderInquiryOption = InquiryLite & {
  product_name_snapshot: string | null;
};

type ReminderFormProps = {
  mode: "create" | "edit";
  reminder?: ReminderWithRelations;
  customers: Customer[];
  inquiries: ReminderInquiryOption[];
  assignees: ProfileLite[];
  defaultCustomerId?: string;
  defaultInquiryId?: string;
  defaultAssigneeId?: string;
  onSuccess?: () => void;
};

export function ReminderForm({
  mode,
  reminder,
  customers,
  inquiries,
  assignees,
  defaultCustomerId,
  defaultInquiryId,
  defaultAssigneeId,
  onSuccess,
}: ReminderFormProps) {
  const router = useRouter();
  const action = mode === "create" ? createReminderAction : updateReminderAction;
  const [state, formAction] = useActionState<ReminderActionState, FormData>(action, {});
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerId, setCustomerId] = useState(
    reminder?.customer_id ?? defaultCustomerId ?? "",
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
      reminder?.inquiries &&
      reminder.inquiries.customer_id === customerId &&
      !list.some((i) => i.id === reminder.inquiries?.id)
    ) {
      list.unshift(reminder.inquiries);
    }
    return list;
  }, [inquiries, customerId, reminder]);

  useEffect(() => {
    if (state.success) {
      onSuccess?.();
      router.refresh();
    }
  }, [state.success, onSuccess, router]);

  const defaultRemindLocal = reminder
    ? toDatetimeLocalIst(reminder.remind_at)
    : "";

  return (
    <form action={formAction} className="space-y-4">
      {reminder ? <input type="hidden" name="reminderId" value={reminder.id} /> : null}

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
        Times are Asia/Kolkata (IST). Status (overdue / today / upcoming) is computed
        from the remind time.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={reminder?.title ?? ""}
            placeholder="Call customer"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="remind_at_local">Date & time (IST)</Label>
          <Input
            id="remind_at_local"
            name="remind_at_local"
            type="datetime-local"
            required
            defaultValue={defaultRemindLocal}
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
            {mode === "edit" && reminder?.customers ? (
              <option value={reminder.customers.id}>
                {reminder.customers.name} · {reminder.customers.mobile}
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
          <Label htmlFor="inquiry_id">Related inquiry (optional)</Label>
          <select
            id="inquiry_id"
            name="inquiry_id"
            defaultValue={reminder?.inquiry_id ?? defaultInquiryId ?? ""}
            key={`${customerId}-${reminder?.inquiry_id ?? defaultInquiryId ?? ""}`}
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
            disabled={!customerId}
          >
            <option value="">None</option>
            {inquiryOptions.map((inquiry) => (
              <option key={inquiry.id} value={inquiry.id}>
                {inquiry.inquiry_date} · {inquiry.product_name_snapshot || "Inquiry"}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="assigned_user_id">Assignee</Label>
          <select
            id="assigned_user_id"
            name="assigned_user_id"
            required
            defaultValue={
              reminder?.assigned_user_id ?? defaultAssigneeId ?? assignees[0]?.id ?? ""
            }
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Select assignee</option>
            {assignees.map((user) => (
              <option key={user.id} value={user.id}>
                {user.display_name} ({user.email})
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
          rows={3}
          defaultValue={reminder?.notes ?? ""}
          placeholder="Optional notes"
        />
      </div>

      <div className="flex justify-end">
        <SubmitButton label={mode === "create" ? "Create reminder" : "Save changes"} />
      </div>
    </form>
  );
}
