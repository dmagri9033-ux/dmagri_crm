import { Badge } from "@/components/ui/badge";
import { formatIstDate } from "@/lib/datetime/ist";
import type { Customer360Followup } from "@/lib/db/customer-360";

export function Customer360Followups({
  followups,
}: {
  followups: Customer360Followup[];
}) {
  if (followups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No follow-ups yet. Use Add follow-up to record one.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {followups.map((followup, index) => (
        <article key={followup.id} className="rounded-lg border p-3 text-sm">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-medium">{formatIstDate(followup.followup_date)}</span>
            {index === 0 ? <Badge variant="secondary">Latest</Badge> : null}
            <span className="text-xs text-muted-foreground">
              by {followup.created_by_profile?.display_name ?? "Unknown"}
            </span>
          </div>
          <p className="whitespace-pre-wrap text-muted-foreground">{followup.notes}</p>
        </article>
      ))}
    </div>
  );
}
