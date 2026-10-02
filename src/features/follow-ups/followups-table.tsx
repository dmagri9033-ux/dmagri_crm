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
import { DeleteFollowupButton } from "@/features/follow-ups/delete-followup-button";
import { EditFollowupDialog } from "@/features/follow-ups/edit-followup-dialog";
import type { FollowupInquiryOption } from "@/features/follow-ups/followup-form";
import { formatIstDate, formatIstDateTime } from "@/lib/datetime/ist";
import type { Customer } from "@/lib/db/customers";
import type { FollowupWithRelations } from "@/lib/db/followups";

export function FollowupsTable({
  followups,
  customers,
  inquiries,
}: {
  followups: FollowupWithRelations[];
  customers: Customer[];
  inquiries: FollowupInquiryOption[];
}) {
  const [selected, setSelected] = useState<FollowupWithRelations | null>(null);

  if (followups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No follow-ups match your filters. Add a follow-up to start history.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[920px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Notes</th>
              <th className="px-4 py-3 font-medium">Inquiry</th>
              <th className="px-4 py-3 font-medium">Created by</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {followups.map((followup) => {
              const customerName = followup.customers?.name ?? "Unknown";
              const notesPreview =
                followup.notes.length > 80
                  ? `${followup.notes.slice(0, 80)}…`
                  : followup.notes;

              return (
                <tr key={followup.id} className="border-t align-top">
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatIstDate(followup.followup_date)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/customers/${followup.customer_id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {customerName}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {followup.customers?.mobile ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{notesPreview}</td>
                  <td className="px-4 py-3">
                    {followup.inquiries ? (
                      <Badge variant="secondary">
                        {followup.inquiries.inquiry_date} ·{" "}
                        {followup.inquiries.product_name_snapshot || "Inquiry"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {followup.created_by_profile?.display_name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(followup)}
                      >
                        View
                      </Button>
                      <EditFollowupDialog
                        followup={followup}
                        customers={customers}
                        inquiries={inquiries}
                      />
                      <DeleteFollowupButton
                        followupId={followup.id}
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
            <SheetTitle>Follow-up details</SheetTitle>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 space-y-4 text-sm">
              <dl className="grid gap-3">
                <div>
                  <dt className="text-muted-foreground">Date</dt>
                  <dd className="font-medium">
                    {formatIstDate(selected.followup_date)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd className="font-medium">{selected.customers?.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Mobile</dt>
                  <dd>{selected.customers?.mobile ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Related inquiry</dt>
                  <dd>
                    {selected.inquiries
                      ? `${selected.inquiries.inquiry_date} · ${selected.inquiries.product_name_snapshot || "Inquiry"}`
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>
                    {selected.created_by_profile?.display_name ?? "—"} ·{" "}
                    {formatIstDateTime(selected.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">{selected.notes}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-2">
                <Button
                  render={<Link href={`/customers/${selected.customer_id}`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  Open Customer 360°
                </Button>
                <EditFollowupDialog
                  followup={selected}
                  customers={customers}
                  inquiries={inquiries}
                />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
