import { Suspense } from "react";
import { CreateProductDialog } from "@/features/products/create-product-dialog";
import { ProductFilters } from "@/features/products/product-filters";
import { ProductsPagination } from "@/features/products/products-pagination";
import { ProductsTable } from "@/features/products/products-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listProducts } from "@/lib/db/products";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { productFilterSchema } from "@/validations/product";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePagePermission("product.view");
  if (!ctx) return <PageForbidden />;

  const raw = await searchParams;
  const filters = productFilterSchema.parse({
    search: typeof raw.search === "string" ? raw.search : "",
    status: typeof raw.status === "string" ? raw.status : "all",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const result = await listProducts(filters);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Products</h2>
          <p className="text-sm text-muted-foreground">
            Manage the product catalog. Inactive products stay on historical
            records but cannot be selected for new inquiries or customers.
          </p>
        </div>
        <CreateProductDialog />
      </div>

      <Suspense fallback={null}>
        <ProductFilters search={filters.search} status={filters.status} />
      </Suspense>

      <ProductsTable products={result.products} />

      <ProductsPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        status={filters.status}
      />
    </div>
  );
}
