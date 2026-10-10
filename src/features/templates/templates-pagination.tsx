import Link from "next/link";
import { Button } from "@/components/ui/button";

export function TemplatesPagination({
  page,
  pageSize,
  total,
  search,
  status,
}: {
  page: number;
  pageSize: number;
  total: number;
  search: string;
  status: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {total} template{total === 1 ? "" : "s"}
      </p>
    );
  }

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/templates?${qs}` : "/templates";
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {totalPages} · {total} template{total === 1 ? "" : "s"}
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
