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
import { DeleteReminderButton } from "@/features/reminders/delete-reminder-button";
import { EditReminderDialog } from "@/features/reminders/edit-reminder-dialog";
import type { ReminderInquiryOption } from "@/features/reminders/reminder-form";
import { ReminderStatusActions } from "@/features/reminders/reminder-status-actions";
import {
  formatIstDateTime,
  formatRelativeTime,
  type ReminderUiStatus,
} from "@/lib/datetime/ist";
import type { Customer } from "@/lib/db/customers";
import type { ProfileLite, ReminderWithRelations } from "@/lib/db/reminders";

function statusBadge(status: ReminderUiStatus) {
  switch (status) {
    case "overdue":
      return <Badge variant="destructive">Overdue</Badge>;
    case "today":
      return <Badge variant="secondary">Today</Badge>;
    case "upcoming":
      return <Badge variant="outline">Upcoming</Badge>;
    case "completed":
      return <Badge variant="secondary">Completed</Badge>;
    case "cancelled":
      return <Badge variant="outline">Cancelled</Badge>;
  }
}

export function RemindersTable({
  reminders,
  customers,
  inquiries,
  assignees,
}: {
  reminders: ReminderWithRelations[];
  customers: Customer[];
  inquiries: ReminderInquiryOption[];
  assignees: ProfileLite[];
}) {
  const [selected, setSelected] = useState<ReminderWithRelations | null>(null);

  if (reminders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No reminders match your filters. Create a reminder to get started.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[1040px] text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">When (IST)</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Customer</th>
              <th className="px-4 py-3 font-medium">Assignee</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((reminder) => (
              <tr key={reminder.id} className="border-t align-top">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>{formatIstDateTime(reminder.remind_at)}</div>
                  <p className="text-xs text-muted-foreground">
                    {formatRelativeTime(reminder.remind_at)}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {statusBadge(reminder.ui_status)}
                    {reminder.actively_snoozed ? (
                      <Badge variant="outline">Snoozed</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{reminder.title}</p>
                  {reminder.notes ? (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {reminder.notes}
                    </p>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/customers/${reminder.customer_id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {reminder.customers?.name ?? "Unknown"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {reminder.customers?.mobile ?? "—"}
                  </p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {reminder.assigned_profile?.display_name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(reminder)}
                      >
                        View
                      </Button>
                      <EditReminderDialog
                        reminder={reminder}
                        customers={customers}
                        inquiries={inquiries}
                        assignees={assignees}
                      />
                      <DeleteReminderButton
                        reminderId={reminder.id}
                        label={reminder.title}
                      />
                    </div>
                    <ReminderStatusActions reminder={reminder} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Sheet open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Reminder details</SheetTitle>
          </SheetHeader>
          {selected ? (
            <div className="mt-4 space-y-4 text-sm">
              <dl className="grid gap-3">
                <div>
                  <dt className="text-muted-foreground">Title</dt>
                  <dd className="font-medium">{selected.title}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">When (IST)</dt>
                  <dd>{formatIstDateTime(selected.remind_at)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="flex flex-wrap gap-1">
                    {statusBadge(selected.ui_status)}
                    {selected.actively_snoozed ? (
                      <Badge variant="outline">Snoozed</Badge>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Customer</dt>
                  <dd>{selected.customers?.name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Assignee</dt>
                  <dd>{selected.assigned_profile?.display_name ?? "—"}</dd>
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
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd className="whitespace-pre-wrap">
                    {selected.notes?.trim() || "—"}
                  </dd>
                </div>
              </dl>
              <ReminderStatusActions reminder={selected} />
              <div className="flex flex-wrap gap-2">
                <Button
                  render={<Link href={`/customers/${selected.customer_id}`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  Open Customer 360°
                </Button>
                <EditReminderDialog
                  reminder={selected}
                  customers={customers}
                  inquiries={inquiries}
                  assignees={assignees}
                />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
