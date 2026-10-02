import { Badge } from "@/components/ui/badge";
import { formatIstDate } from "@/lib/datetime/ist";
import type { Customer360Purchase } from "@/lib/db/customer-360";

export function Customer360Purchases({
  purchases,
}: {
  purchases: Customer360Purchase[];
}) {
  if (purchases.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No purchased products recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="pb-2 pr-3 font-medium">Product</th>
            <th className="pb-2 pr-3 font-medium">Status</th>
            <th className="pb-2 pr-3 font-medium">Purchase date</th>
            <th className="pb-2 font-medium">Related inquiry</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id} className="border-t">
              <td className="py-2.5 pr-3">{purchase.products?.name ?? "—"}</td>
              <td className="py-2.5 pr-3">
                <Badge variant={purchase.is_purchased ? "secondary" : "outline"}>
                  {purchase.is_purchased ? "Purchased" : "Not purchased"}
                </Badge>
              </td>
              <td className="py-2.5 pr-3">
                {purchase.purchased_at ? formatIstDate(purchase.purchased_at) : "—"}
              </td>
              <td className="py-2.5 font-mono text-xs">
                {purchase.inquiry_id ? purchase.inquiry_id.slice(0, 8) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
