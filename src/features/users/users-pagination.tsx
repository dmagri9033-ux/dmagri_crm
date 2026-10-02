import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UsersPagination({
  page,
  pageSize,
  total,
  search,
  status,
  roleId,
}: {
  page: number;
  pageSize: number;
  total: number;
  search: string;
  status: string;
  roleId: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) {
    return (
      <p className="text-sm text-muted-foreground">
        {total} user{total === 1 ? "" : "s"}
      </p>
    );
  }

  function hrefFor(nextPage: number) {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status && status !== "all") params.set("status", status);
    if (roleId) params.set("role_id", roleId);
    if (nextPage > 1) params.set("page", String(nextPage));
    const qs = params.toString();
    return qs ? `/users?${qs}` : "/users";
  }

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Page {page} of {totalPages} · {total} user{total === 1 ? "" : "s"}
      </p>
      <div className="flex gap-2">
        {page <= 1 ? (
          <Button type="button" variant="outline" size="sm" disabled>
            Previous
          </Button>
        ) : (
          <Button
            render={<Link href={hrefFor(page - 1)} />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>
        )}
        {page >= totalPages ? (
          <Button type="button" variant="outline" size="sm" disabled>
            Next
          </Button>
        ) : (
          <Button
            render={<Link href={hrefFor(page + 1)} />}
            nativeButton={false}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
