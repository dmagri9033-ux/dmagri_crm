"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DeleteInquiryButton } from "@/features/inquiries/delete-inquiry-button";
import { EditInquiryDialog } from "@/features/inquiries/edit-inquiry-dialog";
import { CreateFollowupDialog } from "@/features/follow-ups/create-followup-dialog";
import { formatIstDate, formatIstDateTime } from "@/lib/datetime/ist";
import type { Customer } from "@/lib/db/customers";
import type { InquiryWithRelations } from "@/lib/db/inquiries";
import type { Product } from "@/lib/db/products";

export function InquiriesTable({
  inquiries,
  customers,
  products,
}: {
  inquiries: InquiryWithRelations[];
  customers: Customer[];
  products: Product[];
}) {
  const [selected, setSelected] = useState<InquiryWithRelations | null>(null);

  if (inquiries.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No inquiries match your filters. Create an inquiry to get started.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Purchased</th>
              <th className="px-4 py-3 font-medium">Created by</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((inquiry) => {
              const customerName =
                inquiry.customers?.name ||
                inquiry.customer_name_snapshot ||
                "Unknown";
              const productName =
                inquiry.products?.name ||
                inquiry.product_name_snapshot ||
                "—";

              return (
                <tr key={inquiry.id} className="border-t align-top">
                  <td className="px-4 py-3">{formatIstDate(inquiry.inquiry_date)}</td>
                  <td className="px-4 py-3">
                    {inquiry.customer_id ? (
                      <Link
                        href={`/customers/${inquiry.customer_id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {customerName}
                      </Link>
                    ) : (
                      customerName
                    )}
                    <p className="text-xs text-muted-foreground">
                      {inquiry.mobile_snapshot || inquiry.customers?.mobile || "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">{productName}</td>
                  <td className="px-4 py-3 capitalize">
                    {inquiry.customer_type ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={inquiry.product_purchased ? "secondary" : "outline"}>
                      {inquiry.product_purchased ? "Yes" : "No"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {inquiry.created_by_profile?.display_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(inquiry)}
                      >
                        View
                      </Button>
                      <EditInquiryDialog
                        inquiry={inquiry}
                        customers={customers}
                        products={products}
                      />
                      <CreateFollowupDialog
                        customers={customers}
                        inquiries={[
                          {
                            id: inquiry.id,
                            inquiry_date: inquiry.inquiry_date,
                            product_name_snapshot:
                              inquiry.product_name_snapshot ||
                              inquiry.products?.name ||
                              null,
                            customer_id: inquiry.customer_id,
                          },
                        ]}
                        defaultCustomerId={inquiry.customer_id}
                        defaultInquiryId={inquiry.id}
                        triggerLabel="Follow-up"
                        triggerVariant="outline"
                        triggerSize="sm"
                      />
                      <DeleteInquiryButton
                        inquiryId={inquiry.id}
                        label={customerName}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Inquiry details</SheetTitle>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 space-y-4 text-sm">
              <dl className="grid gap-3">
                <div>
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">
                    {formatIstDate(selected.inquiry_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-medium">
                    {selected.customers?.name || selected.customer_name_snapshot}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mobile</dt>
                  <dd>{selected.mobile_snapshot || selected.customers?.mobile}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Product</dt>
                  <dd>
                    {selected.products?.name || selected.product_name_snapshot}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Purchased</dt>
                  <dd>{selected.product_purchased ? "Yes" : "No"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>
                    {selected.created_by_profile?.display_name ?? "—"} ·{" "}
                    {formatIstDateTime(selected.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Remarks</dt>
                  <dd className="whitespace-pre-wrap">
                    {selected.remarks?.trim() || "—"}
                  </dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                {selected.customer_id ? (
                  <Button
                    render={<Link href={`/customers/${selected.customer_id}`} />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  >
                    Open Customer 360°
                  </Button>
                ) : null}
                <EditInquiryDialog
                  inquiry={selected}
                  customers={customers}
                  products={products}
                />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
