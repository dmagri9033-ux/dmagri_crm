import { Badge } from "@/components/ui/badge";
import { formatIstDate, formatIstDateTime } from "@/lib/datetime/ist";
import type { Customer360Data } from "@/lib/db/customer-360";
import { formatMobileDisplay } from "@/lib/customers/normalize-mobile";

export function Customer360Profile({ data }: { data: Customer360Data }) {
  const { customer } = data;

  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-muted-foreground">Name</dt>
        <dd className="mt-1 font-medium">{customer.name}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Mobile</dt>
        <dd className="mt-1 font-medium">
          {formatMobileDisplay(customer.mobile, customer.mobile_normalized)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Customer type</dt>
        <dd className="mt-1 capitalize">{customer.customer_type ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Primary product</dt>
        <dd className="mt-1">
          {customer.products?.name ?? "—"}
          {customer.products && !customer.products.is_active ? " (inactive)" : ""}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Purchase status</dt>
        <dd className="mt-1">
          <Badge variant={customer.product_purchased ? "secondary" : "outline"}>
            {customer.product_purchased ? "Purchased" : "Not purchased"}
          </Badge>
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Follow-up required</dt>
        <dd className="mt-1">
          <Badge variant={customer.follow_up_required ? "secondary" : "outline"}>
            {customer.follow_up_required ? "Yes" : "No"}
          </Badge>
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Assigned</dt>
        <dd className="mt-1">{customer.assigned_profile?.display_name ?? "—"}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Created / Updated</dt>
        <dd className="mt-1 text-muted-foreground">
          {formatIstDateTime(customer.created_at)} · {formatIstDateTime(customer.updated_at)}
        </dd>
      </div>
      <div className="sm:col-span-2">
        <dt className="text-muted-foreground">Summary notes</dt>
        <dd className="mt-1 whitespace-pre-wrap">
          {customer.notes?.trim() ? customer.notes : "—"}
        </dd>
      </div>
      <div className="sm:col-span-2 text-xs text-muted-foreground">
        Profile as of {formatIstDate(customer.updated_at)}
      </div>
    </dl>
  );
}
