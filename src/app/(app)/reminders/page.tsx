import { Suspense } from "react";
import { CreateReminderDialog } from "@/features/reminders/create-reminder-dialog";
import { ReminderFilters } from "@/features/reminders/reminder-filters";
import { RemindersPagination } from "@/features/reminders/reminders-pagination";
import { RemindersTable } from "@/features/reminders/reminders-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listCustomers } from "@/lib/db/customers";
import { listInquiries } from "@/lib/db/inquiries";
import {
  listAssigneeProfiles,
  listReminders,
} from "@/lib/db/reminders";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { reminderFilterSchema } from "@/validations/reminder";

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePagePermission("reminder.view");
  if (!ctx) return <PageForbidden />;

  const raw = await searchParams;
  const filters = reminderFilterSchema.parse({
    search: typeof raw.search === "string" ? raw.search : "",
    status: typeof raw.status === "string" ? raw.status : "open",
    assignedUserId:
      typeof raw.assignedUserId === "string" ? raw.assignedUserId : "",
    customerId: typeof raw.customerId === "string" ? raw.customerId : "",
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : "",
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : "",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, customersResult, inquiriesResult, assignees] = await Promise.all([
    listReminders(filters),
    listCustomers({ pageSize: 100, page: 1 }),
    listInquiries({ pageSize: 100, page: 1 }),
    listAssigneeProfiles(),
  ]);

  const inquiryOptions = inquiriesResult.inquiries.map((inquiry) => ({
    id: inquiry.id,
    inquiry_date: inquiry.inquiry_date,
    product_name_snapshot:
      inquiry.product_name_snapshot || inquiry.products?.name || null,
    customer_id: inquiry.customer_id,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Reminders</h2>
          <p className="text-sm text-muted-foreground">
            Overdue / today / upcoming use Asia/Kolkata day boundaries. Snooze
            updates snoozed until and moves the remind time; complete sets
            completed at. The hourly cron fills the notification bell for today
            and overdue items.
          </p>
        </div>
        <CreateReminderDialog
          customers={customersResult.customers}
          inquiries={inquiryOptions}
          assignees={assignees}
          defaultAssigneeId={ctx.userId}
        />
      </div>

      <Suspense fallback={null}>
        <ReminderFilters
          search={filters.search}
          status={filters.status}
          assignedUserId={filters.assignedUserId}
          customerId={filters.customerId}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          customers={customersResult.customers}
          assignees={assignees}
        />
      </Suspense>

      <RemindersTable
        reminders={result.reminders}
        customers={customersResult.customers}
        inquiries={inquiryOptions}
        assignees={assignees}
      />

      <RemindersPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        status={filters.status}
        assignedUserId={filters.assignedUserId}
        customerId={filters.customerId}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
      />
    </div>
  );
}
