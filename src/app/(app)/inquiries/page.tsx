import { Suspense } from "react";
import { CreateInquiryDialog } from "@/features/inquiries/create-inquiry-dialog";
import { ExcelToolbar } from "@/features/import/excel-toolbar";
import { InquiryFilters } from "@/features/inquiries/inquiry-filters";
import { InquiriesPagination } from "@/features/inquiries/inquiries-pagination";
import { InquiriesTable } from "@/features/inquiries/inquiries-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listCustomers } from "@/lib/db/customers";
import { listInquiries } from "@/lib/db/inquiries";
import { listActiveProducts, listProducts } from "@/lib/db/products";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { inquiryFilterSchema } from "@/validations/inquiry";

export default async function InquiriesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePagePermission("inquiry.view");
  if (!ctx) return <PageForbidden />;

  const raw = await searchParams;
  const filters = inquiryFilterSchema.parse({
    search: typeof raw.search === "string" ? raw.search : "",
    dateFrom: typeof raw.dateFrom === "string" ? raw.dateFrom : "",
    dateTo: typeof raw.dateTo === "string" ? raw.dateTo : "",
    customerType: typeof raw.customerType === "string" ? raw.customerType : "all",
    productId: typeof raw.productId === "string" ? raw.productId : "",
    purchased: typeof raw.purchased === "string" ? raw.purchased : "all",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, customersResult, activeProducts, allProducts] = await Promise.all([
    listInquiries(filters),
    listCustomers({ pageSize: 100, page: 1 }),
    listActiveProducts(),
    listProducts({ status: "all", pageSize: 100 }),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Inquiries</h2>
          <p className="text-sm text-muted-foreground">
            Track customer inquiries by product and purchase status. Use Template /
            Import / Export for Excel workflows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExcelToolbar
            module="inquiries"
            importPermission="inquiry.import"
            exportPermission="inquiry.export"
            exportHref="/api/excel/export/inquiries"
            filterParams={{
              search: filters.search,
              dateFrom: filters.dateFrom,
              dateTo: filters.dateTo,
              customerType: filters.customerType,
              productId: filters.productId,
              purchased: filters.purchased,
            }}
          />
          <CreateInquiryDialog
            customers={customersResult.customers}
            products={activeProducts}
          />
        </div>
      </div>

      <Suspense fallback={null}>
        <InquiryFilters
          search={filters.search}
          dateFrom={filters.dateFrom}
          dateTo={filters.dateTo}
          customerType={filters.customerType}
          productId={filters.productId}
          purchased={filters.purchased}
          products={allProducts.products}
        />
      </Suspense>

      <InquiriesTable
        inquiries={result.inquiries}
        customers={customersResult.customers}
        products={activeProducts}
      />

      <InquiriesPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        customerType={filters.customerType}
        productId={filters.productId}
        purchased={filters.purchased}
      />
    </div>
  );
}
