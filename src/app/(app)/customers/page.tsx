import { Suspense } from "react";
import { CreateCustomerDialog } from "@/features/customers/create-customer-dialog";
import { ExcelToolbar } from "@/features/import/excel-toolbar";
import { CustomerFilters } from "@/features/customers/customer-filters";
import { CustomersPagination } from "@/features/customers/customers-pagination";
import { CustomersTable } from "@/features/customers/customers-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listCustomers } from "@/lib/db/customers";
import { listActiveProducts, listProducts } from "@/lib/db/products";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { customerFilterSchema } from "@/validations/customer";

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
    purchased: typeof raw.purchased === "string" ? raw.purchased : "all",
    followUp: typeof raw.followUp === "string" ? raw.followUp : "all",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, activeProducts, allProductsPage] = await Promise.all([
    listCustomers(filters),
    listActiveProducts(),
    listProducts({ status: "all", pageSize: 100 }),
  ]);

  // Filter dropdown can include inactive products that still appear on customers
  const filterProducts = allProductsPage.products;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Customers</h2>
          <p className="text-sm text-muted-foreground">
            Search and manage customers. Duplicate mobiles are detected on create
            and Excel import — never created silently.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExcelToolbar
            module="customers"
            importPermission="customer.import"
            exportPermission="customer.export"
            exportHref="/api/excel/export/customers"
            filterParams={{
              search: filters.search,
              productId: filters.productId,
              purchased: filters.purchased,
              followUp: filters.followUp,
            }}
          />
          <CreateCustomerDialog products={activeProducts} />
        </div>
      </div>

      <Suspense fallback={null}>
        <CustomerFilters
          search={filters.search}
          productId={filters.productId}
          purchased={filters.purchased}
          followUp={filters.followUp}
          products={filterProducts}
        />
      </Suspense>

      <CustomersTable customers={result.customers} products={activeProducts} />

      <CustomersPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        productId={filters.productId}
        purchased={filters.purchased}
        followUp={filters.followUp}
      />
    </div>
  );
}
