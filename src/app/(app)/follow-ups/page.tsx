import { Suspense } from "react";
import { CreateFollowupDialog } from "@/features/follow-ups/create-followup-dialog";
import { FollowupFilters } from "@/features/follow-ups/followup-filters";
import { FollowupsPagination } from "@/features/follow-ups/followups-pagination";
import { FollowupsTable } from "@/features/follow-ups/followups-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listCustomers } from "@/lib/db/customers";
import { listFollowups } from "@/lib/db/followups";
import { listInquiries } from "@/lib/db/inquiries";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { followupFilterSchema } from "@/validations/followup";

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
    linked: typeof raw.linked === "string" ? raw.linked : "all",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, customersResult, inquiriesResult] = await Promise.all([
    listFollowups(filters),
    listCustomers({ pageSize: 100, page: 1 }),
    listInquiries({ pageSize: 100, page: 1 }),
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
          <h2 className="text-2xl font-semibold tracking-tight">Follow-ups</h2>
          <p className="text-sm text-muted-foreground">
            Append-only conversation history per customer. Each new follow-up is a
            new row — never overwrites the last one.
          </p>
        </div>
        <CreateFollowupDialog
          customers={customersResult.customers}
          inquiries={inquiryOptions}
        />
      </div>

      <Suspense fallback={null}>
        <FollowupFilters
          search={filters.search}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          customerId={filters.customerId}
          linked={filters.linked}
          customers={customersResult.customers}
        />
      </Suspense>

      <FollowupsTable
        followups={result.followups}
        customers={customersResult.customers}
        inquiries={inquiryOptions}
      />

      <FollowupsPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        customerId={filters.customerId}
        linked={filters.linked}
      />
    </div>
  );
}
