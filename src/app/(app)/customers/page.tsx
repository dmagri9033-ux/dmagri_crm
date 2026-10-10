import { Suspense } from "react";
import { ExcelToolbar } from "@/features/import/excel-toolbar";
import { CustomerFilters } from "@/features/customers/customer-filters";
import { CustomersPagination } from "@/features/customers/customers-pagination";
import { CustomersTable } from "@/features/customers/customers-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listCustomers } from "@/lib/db/customers";
import { listActiveProducts } from "@/lib/db/products";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { customerFilterSchema } from "@/validations/customer";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePagePermission("customer.view");
  if (!ctx) return <PageForbidden />;

  const raw = await searchParams;
  const filters = customerFilterSchema.parse({
    search: typeof raw.search === "string" ? raw.search : "",
    productId: typeof raw.productId === "string" ? raw.productId : "",
    customerType:
      typeof raw.customerType === "string" ? raw.customerType : "all",
    purchased: typeof raw.purchased === "string" ? raw.purchased : "all",
    followUp: typeof raw.followUp === "string" ? raw.followUp : "all",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, activeProducts] = await Promise.all([
    listCustomers(filters),
    listActiveProducts(),
  ]);

  const filterProducts = activeProducts;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      <Suspense fallback={null}>
        <CustomerFilters
          search={filters.search}
          productId={filters.productId}
          customerType={filters.customerType}
          purchased={filters.purchased}
          followUp={filters.followUp}
          products={filterProducts}
          heading={
            <h2 className="text-xl font-semibold tracking-tight">Customers</h2>
          }
          actions={
            <>
              <ExcelToolbar
                module="customers"
                importPermission="customer.import"
                exportPermission="customer.export"
                exportHref="/api/excel/export/customers"
                filterParams={{
                  search: filters.search,
                  productId: filters.productId,
                  customerType: filters.customerType,
                  purchased: filters.purchased,
                  followUp: filters.followUp,
                }}
              />
            </>
          }
        />
      </Suspense>

      <CustomersTable
        customers={result.customers}
        products={activeProducts}
        filters={filters}
      />

      <CustomersPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        productId={filters.productId}
        customerType={filters.customerType}
        purchased={filters.purchased}
        followUp={filters.followUp}
      />
    </div>
  );
}
