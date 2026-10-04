import { Suspense } from "react";
import { ExportExcelButton } from "@/features/import/export-excel-button";
import { CreateUserDialog } from "@/features/users/create-user-dialog";
import { UserFilters } from "@/features/users/user-filters";
import { UsersPagination } from "@/features/users/users-pagination";
import { UsersTable } from "@/features/users/users-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listRolesForUserPicker, listUsers } from "@/lib/db/users";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { userFilterSchema } from "@/validations/user";

export const dynamic = "force-dynamic";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePagePermission("user.view");
  if (!ctx) return <PageForbidden />;

  const raw = await searchParams;
  const filters = userFilterSchema.parse({
    search: typeof raw.search === "string" ? raw.search : "",
    status: typeof raw.status === "string" ? raw.status : "all",
    role_id: typeof raw.role_id === "string" ? raw.role_id : "",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const [result, roles] = await Promise.all([
    listUsers(filters),
    listRolesForUserPicker(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Suspense fallback={null}>
        <UserFilters
          search={filters.search}
          status={filters.status}
          roleId={filters.role_id}
          roles={roles}
          heading={
            <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
          }
          actions={
            <>
              <ExportExcelButton
                exportPermission="user.export"
                exportHref="/api/excel/export/users"
                filterParams={{
                  search: filters.search,
                  status: filters.status,
                  role_id: filters.role_id,
                }}
              />
              <CreateUserDialog roles={roles} />
            </>
          }
        />
      </Suspense>

      <UsersTable users={result.users} filters={filters} roles={roles} />

      <UsersPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        status={filters.status}
        roleId={filters.role_id}
      />
    </div>
  );
}
