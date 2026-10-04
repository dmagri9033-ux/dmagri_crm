import { NextResponse } from "next/server";
import { formatActivityAction } from "@/lib/activity/labels";
import { formatIstDateTime } from "@/lib/datetime/ist";
import { listActivityLogsForExport } from "@/lib/db/activity";
import { excelWorkbookResponse } from "@/lib/excel/export-response";
import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { activityFilterSchema } from "@/validations/activity";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authorize("activity.export");
    const url = new URL(request.url);
    const filters = activityFilterSchema.parse({
      search: url.searchParams.get("search") ?? "",
      module: url.searchParams.get("module") ?? "all",
      action: url.searchParams.get("action") ?? "",
      actorId: url.searchParams.get("actorId") ?? "",
      customerId: url.searchParams.get("customerId") ?? "",
      dateFrom: url.searchParams.get("dateFrom") ?? "",
      dateTo: url.searchParams.get("dateTo") ?? "",
      page: 1,
      pageSize: 100,
    });

    const logs = await listActivityLogsForExport(filters);

    return excelWorkbookResponse({
      sheetName: "Activity",
      filenamePrefix: "activity-export",
      headers: [
        "When",
        "Module",
        "Action",
        "Actor",
        "Customer",
        "Entity Type",
        "Entity Id",
      ],
      rows: logs.map((log) => [
        formatIstDateTime(log.created_at),
        log.module,
        formatActivityAction(log.action),
        log.actor?.display_name || log.actor?.email || "",
        log.customers?.name || log.customers?.mobile || "",
        log.entity_type,
        log.entity_id,
      ]),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
