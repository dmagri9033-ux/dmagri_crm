import { Suspense } from "react";
import { CreateUserDialog } from "@/features/users/create-user-dialog";
import { UserFilters } from "@/features/users/user-filters";
import { UsersPagination } from "@/features/users/users-pagination";
import { UsersTable } from "@/features/users/users-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listRolesForUserPicker, listUsers } from "@/lib/db/users";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { userFilterSchema } from "@/validations/user";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Users</h2>
          <p className="text-sm text-muted-foreground">
            Provision CRM accounts, assign roles, and activate or deactivate
            access. Passwords are never stored on the profile.
          </p>
        </div>
        <CreateUserDialog roles={roles} />
      </div>

      <Suspense fallback={null}>
        <UserFilters
          search={filters.search}
          status={filters.status}
          roleId={filters.role_id}
          roles={roles}
        />
      </Suspense>

      <UsersTable users={result.users} roles={roles} />

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
