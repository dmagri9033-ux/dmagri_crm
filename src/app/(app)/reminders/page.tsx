import { Suspense } from "react";
import { ExportExcelButton } from "@/features/import/export-excel-button";
import { ReminderFilters } from "@/features/reminders/reminder-filters";
import { RemindersPagination } from "@/features/reminders/reminders-pagination";
import { RemindersTable } from "@/features/reminders/reminders-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listCustomers } from "@/lib/db/customers";
import {
  listAssigneeProfiles,
  listReminders,
} from "@/lib/db/reminders";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { reminderFilterSchema } from "@/validations/reminder";

export const dynamic = "force-dynamic";

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
    customerType:
      typeof raw.customerType === "string" ? raw.customerType : "all",
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : "",
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : "",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, customersResult, assignees] = await Promise.all([
    listReminders(filters),
    listCustomers({ pageSize: 100, page: 1 }),
    listAssigneeProfiles(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <Suspense fallback={null}>
        <ReminderFilters
          search={filters.search}
          status={filters.status}
          assignedUserId={filters.assignedUserId}
          customerId={filters.customerId}
          customerType={filters.customerType}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          customers={customersResult.customers}
          assignees={assignees}
          heading={
            <h2 className="text-2xl font-semibold tracking-tight">Reminders</h2>
          }
          actions={
            <ExportExcelButton
              exportPermission="reminder.export"
              exportHref="/api/excel/export/reminders"
              filterParams={{
                search: filters.search,
                status: filters.status,
                assignedUserId: filters.assignedUserId,
                customerId: filters.customerId,
                customerType: filters.customerType,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
              }}
            />
          }
        />
      </Suspense>

      <RemindersTable
        reminders={result.reminders}
        assignees={assignees}
        defaultAssigneeId={ctx.userId}
        filters={filters}
      />

      <RemindersPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        status={filters.status}
        assignedUserId={filters.assignedUserId}
        customerId={filters.customerId}
        customerType={filters.customerType}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
      />
    </div>
  );
}
