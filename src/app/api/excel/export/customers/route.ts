import { NextResponse } from "next/server";
import { listCustomersForExport } from "@/lib/db/customers";
import { excelWorkbookResponse } from "@/lib/excel/export-response";
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
      customerType: url.searchParams.get("customerType") ?? "all",
      purchased: url.searchParams.get("purchased") ?? "all",
      followUp: url.searchParams.get("followUp") ?? "all",
      page: 1,
      pageSize: 100,
    });

    const customers = await listCustomersForExport(filters);

    return excelWorkbookResponse({
      sheetName: "Customers",
      filenamePrefix: "customers-export",
      headers: [
        "Customer Name",
        "Mobile",
        "Customer Type",
        "Primary Product",
        "Purchased",
        "Follow-up Required",
        "Notes",
      ],
      rows: customers.map((customer) => [
        customer.name,
        customer.mobile,
        customer.customer_type ?? "",
        customer.products?.name ?? "",
        customer.product_purchased ? "Yes" : "No",
        customer.follow_up_required ? "Yes" : "No",
        customer.notes ?? "",
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
