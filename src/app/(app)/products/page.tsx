import { Suspense } from "react";
import { ProductFilters } from "@/features/products/product-filters";
import { ProductsPagination } from "@/features/products/products-pagination";
import { ProductsTable } from "@/features/products/products-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listProducts } from "@/lib/db/products";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { productFilterSchema } from "@/validations/product";

export const dynamic = "force-dynamic";

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
      <Suspense fallback={null}>
        <ProductFilters
          search={filters.search}
          status={filters.status}
          heading={
            <h2 className="text-2xl font-semibold tracking-tight">Products</h2>
          }
        />
      </Suspense>

      <ProductsTable products={result.products} filters={filters} />

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
