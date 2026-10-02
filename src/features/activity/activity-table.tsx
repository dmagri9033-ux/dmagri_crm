import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatActivityAction } from "@/lib/activity/labels";
import { formatIstDateTime, formatRelativeTime } from "@/lib/datetime/ist";
import type { ActivityLogWithRelations } from "@/lib/db/activity";

export function ActivityTable({ logs }: { logs: ActivityLogWithRelations[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        No activity matches your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[960px] text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">When</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Module</th>
            <th className="px-4 py-3 font-medium">Actor</th>
            <th className="px-4 py-3 font-medium">Customer</th>
            <th className="px-4 py-3 font-medium">Entity</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t align-top">
              <td className="px-4 py-3 whitespace-nowrap">
                <div>{formatIstDateTime(log.created_at)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(log.created_at)}
                </p>
              </td>
              <td className="px-4 py-3 font-medium">
                {formatActivityAction(log.action)}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">{log.module}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {log.actor?.display_name ?? "—"}
              </td>
              <td className="px-4 py-3">
                {log.customer_id && log.customers ? (
                  <Link
                    href={`/customers/${log.customer_id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {log.customers.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {log.entity_type}
                <span className="block font-mono text-[10px] opacity-70">
                  {log.entity_id.slice(0, 8)}…
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
