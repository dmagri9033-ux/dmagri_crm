import { Badge } from "@/components/ui/badge";
import { EditProductDialog } from "@/features/products/edit-product-dialog";
import { ProductRowActions } from "@/features/products/product-row-actions";
import type { Product } from "@/lib/db/products";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(value));
}

export function ProductsTable({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No products match your filters. Create a product to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Updated</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-t align-top">
              <td className="px-4 py-3 font-medium">{product.name}</td>
              <td className="px-4 py-3">
                <Badge variant={product.is_active ? "secondary" : "outline"}>
                  {product.is_active ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(product.created_at)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDate(product.updated_at)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col items-end gap-2">
                  <EditProductDialog product={product} />
                  <ProductRowActions product={product} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
