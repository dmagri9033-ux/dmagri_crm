import Link from "next/link";
import { Button } from "@/components/ui/button";

export function ActivityPagination({
  page,
  pageSize,
  total,
  search,
  module,
  action,
  actorId,
  dateFrom,
  dateTo,
}: {
  page: number;
  pageSize: number;
  total: number;
  search: string;
  module: string;
  action: string;
  actorId: string;
  dateFrom: string;
  dateTo: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (module && module !== "all") params.set("module", module);
    if (action) params.set("action", action);
    if (actorId) params.set("actorId", actorId);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/activity?${qs}` : "/activity";
  }

  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {total} event{total === 1 ? "" : "s"}
      </p>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {totalPages} · {total} event{total === 1 ? "" : "s"}
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
