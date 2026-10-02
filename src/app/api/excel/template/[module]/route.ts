import { NextResponse } from "next/server";
import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { CUSTOMER_IMPORT_TEMPLATE_HEADERS } from "@/lib/excel/customer-import-hooks";
import { INQUIRY_IMPORT_TEMPLATE_HEADERS } from "@/lib/excel/inquiry-import-hooks";
import { createTemplateBuffer } from "@/lib/excel/workbook";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ module: string }> },
) {
  try {
    const { module } = await context.params;
    if (module !== "inquiries" && module !== "customers") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await authorize(module === "inquiries" ? "inquiry.import" : "customer.import");

    const headers =
      module === "inquiries"
        ? Object.values(INQUIRY_IMPORT_TEMPLATE_HEADERS)
        : Object.values(CUSTOMER_IMPORT_TEMPLATE_HEADERS);

    const sample =
      module === "inquiries"
        ? [
            "2026-10-01",
            "Ram Kumar",
            "9876543210",
            "farmer",
            "Sample Product",
            "No",
            "Interested in demo",
          ]
        : [
            "Ram Kumar",
            "9876543210",
            "farmer",
            "Sample Product",
            "No",
            "Yes",
            "Prefers morning calls",
          ];

    const buffer = await createTemplateBuffer(headers, "Template", sample);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${module}-import-template.xlsx"`,
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
