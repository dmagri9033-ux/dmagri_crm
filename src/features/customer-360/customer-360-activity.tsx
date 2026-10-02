import { formatActivityAction } from "@/lib/activity/labels";
import { formatRelativeTime } from "@/lib/datetime/ist";
import type { Customer360Activity } from "@/lib/db/customer-360";

export function Customer360Activity({
  activity,
}: {
  activity: Customer360Activity[];
}) {
  if (activity.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No activity yet. Actions on this customer will appear here.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {activity.map((item) => (
        <li key={item.id} className="relative border-l pl-4 text-sm">
          <span className="absolute -left-1.5 top-1.5 size-3 rounded-full bg-foreground/20" />
          <p className="font-medium">{formatActivityAction(item.action)}</p>
          <p className="text-xs text-muted-foreground">
            {item.actor?.display_name ?? "System"} ·{" "}
            {formatRelativeTime(item.created_at)}
            <span className="ml-1 capitalize opacity-70">· {item.module}</span>
          </p>
        </li>
      ))}
    </ol>
  );
}
