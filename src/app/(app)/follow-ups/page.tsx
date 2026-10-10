import { Suspense } from "react";
import { ExportExcelButton } from "@/features/import/export-excel-button";
import { FollowupFilters } from "@/features/follow-ups/followup-filters";
import { FollowupsPagination } from "@/features/follow-ups/followups-pagination";
import { FollowupsTable } from "@/features/follow-ups/followups-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listCustomers } from "@/lib/db/customers";
import { listFollowups } from "@/lib/db/followups";
import { listProducts } from "@/lib/db/products";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { followupFilterSchema } from "@/validations/followup";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePagePermission("followup.view");
  if (!ctx) return <PageForbidden />;

  const raw = await searchParams;
  const filters = followupFilterSchema.parse({
    search: typeof raw.search === "string" ? raw.search : "",
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : "",
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : "",
    customerId: typeof raw.customerId === "string" ? raw.customerId : "",
    customerType:
      typeof raw.customerType === "string" ? raw.customerType : "all",
    linked: typeof raw.linked === "string" ? raw.linked : "all",
    status: typeof raw.status === "string" ? raw.status : "open",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, customersResult, productsResult] = await Promise.all([
    listFollowups(filters),
    // Filter dropdown only — keep payload small.
    listCustomers({ pageSize: 50, page: 1 }),
    listProducts({ status: "active", pageSize: 100 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      <Suspense fallback={null}>
        <FollowupFilters
          search={filters.search}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          customerId={filters.customerId}
          customerType={filters.customerType}
          linked={filters.linked}
          status={filters.status}
          customers={customersResult.customers}
          heading={
            <h2 className="text-xl font-semibold tracking-tight">Follow-ups</h2>
          }
          actions={
            <ExportExcelButton
              exportPermission="followup.export"
              exportHref="/api/excel/export/follow-ups"
              filterParams={{
                search: filters.search,
                dateFrom: filters.dateFrom,
                dateTo: filters.dateTo,
                customerId: filters.customerId,
                customerType: filters.customerType,
                linked: filters.linked,
                status: filters.status,
              }}
            />
          }
        />
      </Suspense>

      <FollowupsTable
        followups={result.followups}
        products={productsResult.products}
        filters={filters}
      />

      <FollowupsPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        customerId={filters.customerId}
        customerType={filters.customerType}
        linked={filters.linked}
        status={filters.status}
      />
    </div>
  );
}
