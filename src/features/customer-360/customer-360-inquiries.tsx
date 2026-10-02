import { Badge } from "@/components/ui/badge";
import { formatIstDate } from "@/lib/datetime/ist";
import type { Customer360Inquiry } from "@/lib/db/customer-360";

export function Customer360Inquiries({
  inquiries,
}: {
  inquiries: Customer360Inquiry[];
}) {
  if (inquiries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No inquiries yet. Use Add inquiry to create the first one.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="pb-2 pr-3 font-medium">Date</th>
            <th className="pb-2 pr-3 font-medium">Product</th>
            <th className="pb-2 pr-3 font-medium">Type</th>
            <th className="pb-2 pr-3 font-medium">Purchased</th>
            <th className="pb-2 pr-3 font-medium">Remarks</th>
            <th className="pb-2 font-medium">Created by</th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((inquiry) => (
            <tr key={inquiry.id} className="border-t align-top">
              <td className="py-2.5 pr-3">{formatIstDate(inquiry.inquiry_date)}</td>
              <td className="py-2.5 pr-3">
                {inquiry.product_name_snapshot || inquiry.products?.name || "—"}
              </td>
              <td className="py-2.5 pr-3 capitalize">
                {inquiry.customer_type ?? "—"}
              </td>
              <td className="py-2.5 pr-3">
                <Badge variant={inquiry.product_purchased ? "secondary" : "outline"}>
                  {inquiry.product_purchased ? "Yes" : "No"}
                </Badge>
              </td>
              <td className="py-2.5 pr-3 max-w-[220px] truncate">
                {inquiry.remarks || "—"}
              </td>
              <td className="py-2.5">
                {inquiry.created_by_profile?.display_name ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
