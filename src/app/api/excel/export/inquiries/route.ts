import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { listInquiriesForExport } from "@/lib/db/inquiries";
import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { inquiryFilterSchema } from "@/validations/inquiry";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authorize("inquiry.export");
    const url = new URL(request.url);
    const filters = inquiryFilterSchema.parse({
      search: url.searchParams.get("search") ?? "",
      dateFrom: url.searchParams.get("dateFrom") ?? "",
      dateTo: url.searchParams.get("dateTo") ?? "",
      customerType: url.searchParams.get("customerType") ?? "all",
      productId: url.searchParams.get("productId") ?? "",
      purchased: url.searchParams.get("purchased") ?? "all",
      page: 1,
      pageSize: 100,
    });

    const inquiries = await listInquiriesForExport(filters);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Inquiries");
    sheet.addRow([
      "Date",
      "Customer Name",
      "Mobile",
      "Customer Type",
      "Product",
      "Purchased",
      "Remarks",
      "Created By",
    ]);
    sheet.getRow(1).font = { bold: true };

    for (const inquiry of inquiries) {
      sheet.addRow([
        inquiry.inquiry_date,
        inquiry.customers?.name || inquiry.customer_name_snapshot || "",
        inquiry.customers?.mobile || inquiry.mobile_snapshot || "",
        inquiry.customer_type ?? "",
        inquiry.products?.name || inquiry.product_name_snapshot || "",
        inquiry.product_purchased ? "Yes" : "No",
        inquiry.remarks ?? "",
        inquiry.created_by_profile?.display_name ?? "",
      ]);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="inquiries-export-${stamp}.xlsx"`,
      },
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
