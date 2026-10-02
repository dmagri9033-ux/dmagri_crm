"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, Phone } from "lucide-react";
import { Can } from "@/components/shared/can";
import { EditCustomerDialog } from "@/features/customers/edit-customer-dialog";
import { DeleteCustomerButton } from "@/features/customers/delete-customer-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMobileDisplay } from "@/lib/customers/normalize-mobile";
import type { Customer360Data } from "@/lib/db/customer-360";
import type { Product } from "@/lib/db/products";
import { AddInquiryDialog } from "@/features/customer-360/add-inquiry-dialog";
import { AddFollowupDialog } from "@/features/customer-360/add-followup-dialog";
import { AddReminderDialog } from "@/features/customer-360/add-reminder-dialog";

export function Customer360Header({
  data,
  products,
}: {
  data: Customer360Data;
  products: Product[];
}) {
  const { customer } = data;
  const [copied, setCopied] = useState(false);
  const displayMobile = formatMobileDisplay(
    customer.mobile,
    customer.mobile_normalized,
  );

  async function copyMobile() {
    try {
      await navigator.clipboard.writeText(customer.mobile_normalized || customer.mobile);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">{customer.name}</h2>
            {customer.customer_type ? (
              <Badge variant="outline" className="capitalize">
                {customer.customer_type}
              </Badge>
            ) : null}
            <Badge variant={customer.product_purchased ? "secondary" : "outline"}>
              {customer.product_purchased ? "Purchased" : "Not purchased"}
            </Badge>
            <Badge variant={customer.follow_up_required ? "secondary" : "outline"}>
              {customer.follow_up_required ? "Follow-up required" : "No follow-up"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{displayMobile}</p>
          <p className="text-xs text-muted-foreground">
            Assigned: {customer.assigned_profile?.display_name ?? "Unassigned"}
          </p>
        </div>

        <Button render={<Link href="/customers" />} nativeButton={false} variant="outline" size="sm">
          Back to list
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Can permission="inquiry.create">
          <AddInquiryDialog
            customerId={customer.id}
            customerType={customer.customer_type}
            products={products}
          />
        </Can>
        <Can permission="followup.create">
          <AddFollowupDialog
            customer={customer}
            inquiries={data.inquiries}
          />
        </Can>
        <Can permission="reminder.create">
          <AddReminderDialog customerId={customer.id} />
        </Can>
        <EditCustomerDialog customer={customer} products={products} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <a href={`tel:${customer.mobile_normalized || customer.mobile}`} />
          }
        >
          <Phone className="size-4" />
          Call
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={copyMobile}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy mobile"}
        </Button>
        <DeleteCustomerButton
          customerId={customer.id}
          customerName={customer.name}
          redirectToList
        />
      </div>
    </div>
  );
}
