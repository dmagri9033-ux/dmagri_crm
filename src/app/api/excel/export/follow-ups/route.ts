import { NextResponse } from "next/server";
import { listFollowupsForExport } from "@/lib/db/followups";
import { excelWorkbookResponse } from "@/lib/excel/export-response";
import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { followupFilterSchema } from "@/validations/followup";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authorize("followup.export");
    const url = new URL(request.url);
    const filters = followupFilterSchema.parse({
      search: url.searchParams.get("search") ?? "",
      dateFrom: url.searchParams.get("dateFrom") ?? "",
      dateTo: url.searchParams.get("dateTo") ?? "",
      customerId: url.searchParams.get("customerId") ?? "",
      customerType: url.searchParams.get("customerType") ?? "all",
      linked: url.searchParams.get("linked") ?? "all",
      page: 1,
      pageSize: 100,
    });

    const followups = await listFollowupsForExport(filters);

    return excelWorkbookResponse({
      sheetName: "Follow-ups",
      filenamePrefix: "followups-export",
      headers: [
        "Date",
        "Customer Name",
        "Mobile",
        "Customer Type",
        "Linked Inquiry",
        "Notes",
        "Created By",
      ],
      rows: followups.map((followup) => [
        followup.followup_date,
        followup.customers?.name ?? "",
        followup.customers?.mobile ?? "",
        followup.customers?.customer_type ?? "",
        followup.inquiries
          ? `${followup.inquiries.inquiry_date}${
              followup.inquiries.product_name_snapshot
                ? ` · ${followup.inquiries.product_name_snapshot}`
                : ""
            }`
          : "",
        followup.notes ?? "",
        followup.created_by_profile?.display_name ?? "",
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
