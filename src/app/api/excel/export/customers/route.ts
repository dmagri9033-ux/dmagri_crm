import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { listCustomersForExport } from "@/lib/db/customers";
import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { customerFilterSchema } from "@/validations/customer";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authorize("customer.export");
    const url = new URL(request.url);
    const filters = customerFilterSchema.parse({
      search: url.searchParams.get("search") ?? "",
      productId: url.searchParams.get("productId") ?? "",
      purchased: url.searchParams.get("purchased") ?? "all",
      followUp: url.searchParams.get("followUp") ?? "all",
      page: 1,
      pageSize: 100,
    });

    const customers = await listCustomersForExport(filters);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Customers");
    sheet.addRow([
      "Customer Name",
      "Mobile",
      "Customer Type",
      "Primary Product",
      "Purchased",
      "Follow-up Required",
      "Notes",
    ]);
    sheet.getRow(1).font = { bold: true };

    for (const customer of customers) {
      sheet.addRow([
        customer.name,
        customer.mobile,
        customer.customer_type ?? "",
        customer.products?.name ?? "",
        customer.product_purchased ? "Yes" : "No",
        customer.follow_up_required ? "Yes" : "No",
        customer.notes ?? "",
      ]);
    }

    const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="customers-export-${stamp}.xlsx"`,
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
