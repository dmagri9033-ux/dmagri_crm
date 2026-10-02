import Link from "next/link";
import { Button } from "@/components/ui/button";

export function FollowupsPagination({
  page,
  pageSize,
  total,
  search,
  dateFrom,
  dateTo,
  customerId,
  customerType,
  linked,
}: {
  page: number;
  pageSize: number;
  total: number;
  search: string;
  dateFrom: string;
  dateTo: string;
  customerId: string;
  customerType: string;
  linked: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (customerId) params.set("customerId", customerId);
    if (customerType && customerType !== "all") {
      params.set("customerType", customerType);
    }
    if (linked && linked !== "all") params.set("linked", linked);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/follow-ups?${qs}` : "/follow-ups";
  }

  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {total} follow-up{total === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {totalPages} · {total} follow-up{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button type="button" variant="outline" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <Button render={<Link href={hrefFor(page - 1)} />} nativeButton={false} variant="outline" size="sm">
            Previous
          </Button>
        )}
        {page >= totalPages ? (
          <Button type="button" variant="outline" size="sm" disabled>
            Next
          </Button>
        ) : (
          <Button render={<Link href={hrefFor(page + 1)} />} nativeButton={false} variant="outline" size="sm">
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
