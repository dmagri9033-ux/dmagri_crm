import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeleteCustomerButton } from "@/features/customers/delete-customer-button";
import { EditCustomerDialog } from "@/features/customers/edit-customer-dialog";
import { formatMobileDisplay } from "@/lib/customers/normalize-mobile";
import type { CustomerWithProduct } from "@/lib/db/customers";
import type { Product } from "@/lib/db/products";

export function CustomersTable({
  customers,
  products,
}: {
  customers: CustomerWithProduct[];
  products: Product[];
}) {
  if (customers.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No customers match your filters. Add a customer to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Mobile</th>
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Purchased</th>
            <th className="px-4 py-3 font-medium">Follow-up</th>
            <th className="px-4 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-t align-top">
              <td className="px-4 py-3">
                <Link
                  href={`/customers/${customer.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {customer.name}
                </Link>
                {customer.customer_type ? (
                  <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                    {customer.customer_type}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatMobileDisplay(customer.mobile, customer.mobile_normalized)}
              </td>
              <td className="px-4 py-3">
                {customer.products?.name ?? (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge variant={customer.product_purchased ? "secondary" : "outline"}>
                  {customer.product_purchased ? "Yes" : "No"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <Badge variant={customer.follow_up_required ? "secondary" : "outline"}>
                  {customer.follow_up_required ? "Required" : "No"}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    render={<Link href={`/customers/${customer.id}`} />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  >
                    View
                  </Button>
                  <EditCustomerDialog customer={customer} products={products} />
                  <DeleteCustomerButton
                    customerId={customer.id}
                    customerName={customer.name}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
