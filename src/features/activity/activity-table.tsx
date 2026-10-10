import Link from "next/link";
import {
  gridCellPad,
  gridDataRowClass,
  gridHeaderCellClass,
  gridHeaderRowClass,
  gridTableClass,
} from "@/components/shared/data-grid";
import { Badge } from "@/components/ui/badge";
import { formatActivityAction } from "@/lib/activity/labels";
import { formatIstDateTime, formatRelativeTime } from "@/lib/datetime/ist";
import type { ActivityLogWithRelations } from "@/lib/db/activity";
import { cn } from "@/lib/utils";

export function ActivityTable({ logs }: { logs: ActivityLogWithRelations[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
        No activity matches your filters.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className={cn(gridTableClass, "min-w-[960px]")}>
        <thead>
          <tr className={gridHeaderRowClass}>
            <th className={gridHeaderCellClass}>When</th>
            <th className={gridHeaderCellClass}>Action</th>
            <th className={gridHeaderCellClass}>Module</th>
            <th className={gridHeaderCellClass}>Actor</th>
            <th className={gridHeaderCellClass}>Customer</th>
            <th className={gridHeaderCellClass}>Entity</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className={cn(gridDataRowClass, "align-top")}>
              <td className={cn(gridCellPad, "whitespace-nowrap tabular-nums")}>
                <div>{formatIstDateTime(log.created_at)}</div>
                <p className="text-[10px] text-muted-foreground">
                  {formatRelativeTime(log.created_at)}
                </p>
              </td>
              <td className={cn(gridCellPad, "font-medium")}>
                {formatActivityAction(log.action)}
              </td>
              <td className={gridCellPad}>
                <Badge variant="outline">{log.module}</Badge>
              </td>
              <td className={cn(gridCellPad, "text-muted-foreground")}>
                {log.actor?.display_name ?? "—"}
              </td>
              <td className={gridCellPad}>
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
              <td className={cn(gridCellPad, "text-muted-foreground")}>
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
