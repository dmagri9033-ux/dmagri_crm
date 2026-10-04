import { NextResponse } from "next/server";
import { formatIstDateTime } from "@/lib/datetime/ist";
import { listRemindersForExport } from "@/lib/db/reminders";
import { excelWorkbookResponse } from "@/lib/excel/export-response";
import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { reminderFilterSchema } from "@/validations/reminder";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authorize("reminder.export");
    const url = new URL(request.url);
    const filters = reminderFilterSchema.parse({
      search: url.searchParams.get("search") ?? "",
      status: url.searchParams.get("status") ?? "open",
      assignedUserId: url.searchParams.get("assignedUserId") ?? "",
      customerId: url.searchParams.get("customerId") ?? "",
      customerType: url.searchParams.get("customerType") ?? "all",
      dateFrom: url.searchParams.get("dateFrom") ?? "",
      dateTo: url.searchParams.get("dateTo") ?? "",
      page: 1,
      pageSize: 100,
    });

    const reminders = await listRemindersForExport(filters);

    return excelWorkbookResponse({
      sheetName: "Reminders",
      filenamePrefix: "reminders-export",
      headers: [
        "When",
        "Title",
        "Customer",
        "Mobile",
        "Product",
        "Assignee",
        "Status",
        "Snoozed",
        "Notes",
      ],
      rows: reminders.map((reminder) => [
        formatIstDateTime(reminder.remind_at),
        reminder.title,
        reminder.customers?.name ?? "",
        reminder.customers?.mobile ?? "",
        reminder.product_name ?? "",
        reminder.assigned_profile?.display_name ||
          reminder.assigned_profile?.email ||
          "",
        reminder.ui_status,
        reminder.actively_snoozed ? "Yes" : "No",
        reminder.notes ?? "",
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
