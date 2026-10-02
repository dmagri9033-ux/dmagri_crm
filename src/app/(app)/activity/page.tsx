import { Suspense } from "react";
import { ActivityFilters } from "@/features/activity/activity-filters";
import { ActivityPagination } from "@/features/activity/activity-pagination";
import { ActivityTable } from "@/features/activity/activity-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import {
  listActivityLogs,
  listDistinctActivityActions,
} from "@/lib/db/activity";
import { listAssigneeProfiles } from "@/lib/db/reminders";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { activityFilterSchema } from "@/validations/activity";

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePagePermission("activity.view");
  if (!ctx) return <PageForbidden />;

  const raw = await searchParams;
  const filters = activityFilterSchema.parse({
    search: typeof raw.search === "string" ? raw.search : "",
    module: typeof raw.module === "string" ? raw.module : "all",
    action: typeof raw.action === "string" ? raw.action : "",
    actorId: typeof raw.actorId === "string" ? raw.actorId : "",
    customerId: typeof raw.customerId === "string" ? raw.customerId : "",
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : "",
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : "",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, actors, actions] = await Promise.all([
    listActivityLogs(filters),
    listAssigneeProfiles(),
    listDistinctActivityActions(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Activity</h2>
        <p className="text-sm text-muted-foreground">
          Global audit trail for CRM mutations. Customer 360 shows the same
          events scoped to one customer.
        </p>
      </div>

      <Suspense fallback={null}>
        <ActivityFilters
          search={filters.search}
          module={filters.module}
          action={filters.action}
          actorId={filters.actorId}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          actors={actors}
          actions={actions}
        />
      </Suspense>

      <ActivityTable logs={result.logs} />

      <ActivityPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        module={filters.module}
        action={filters.action}
        actorId={filters.actorId}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
      />
    </div>
  );
}
