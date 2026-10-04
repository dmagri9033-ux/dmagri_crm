import { NextResponse } from "next/server";
import { listUsersForExport } from "@/lib/db/users";
import { excelWorkbookResponse } from "@/lib/excel/export-response";
import { authorize } from "@/lib/rbac/authorize";
import { ForbiddenError, UnauthorizedError } from "@/lib/rbac/errors";
import { userFilterSchema } from "@/validations/user";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await authorize("user.export");
    const url = new URL(request.url);
    const filters = userFilterSchema.parse({
      search: url.searchParams.get("search") ?? "",
      status: url.searchParams.get("status") ?? "all",
      role_id: url.searchParams.get("role_id") ?? "",
      page: 1,
      pageSize: 100,
    });

    const users = await listUsersForExport(filters);

    return excelWorkbookResponse({
      sheetName: "Users",
      filenamePrefix: "users-export",
      headers: ["Name", "Email", "Role", "Status", "Created"],
      rows: users.map((user) => [
        user.display_name,
        user.email,
        user.role?.name ?? "",
        user.is_active ? "Active" : "Inactive",
        user.created_at?.slice(0, 10) ?? "",
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
