import { NextResponse } from "next/server";
import { listProductsForExport } from "@/lib/db/products";
import { excelWorkbookResponse } from "@/lib/excel/export-response";
import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { productFilterSchema } from "@/validations/product";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authorize("product.export");
    const url = new URL(request.url);
    const filters = productFilterSchema.parse({
      search: url.searchParams.get("search") ?? "",
      status: url.searchParams.get("status") ?? "all",
      page: 1,
      pageSize: 100,
    });

    const products = await listProductsForExport(filters);

    return excelWorkbookResponse({
      sheetName: "Products",
      filenamePrefix: "products-export",
      headers: ["Product", "Status", "Created"],
      rows: products.map((product) => [
        product.name,
        product.is_active ? "Active" : "Inactive",
        product.created_at?.slice(0, 10) ?? "",
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
