import { Suspense } from "react";
import { CreateTemplateDialog } from "@/features/templates/create-template-dialog";
import { TemplateFilters } from "@/features/templates/template-filters";
import { TemplatesPagination } from "@/features/templates/templates-pagination";
import { TemplatesTable } from "@/features/templates/templates-table";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { listWhatsAppTemplates } from "@/lib/db/templates";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";
import { templateFilterSchema } from "@/validations/template";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await requirePagePermission("template.view");
  if (!ctx) return <PageForbidden />;

  const raw = await searchParams;
  const filters = templateFilterSchema.parse({
    search: typeof raw.search === "string" ? raw.search : "",
    status: typeof raw.status === "string" ? raw.status : "all",
    page: typeof raw.page === "string" ? raw.page : "1",
  });

  const result = await listWhatsAppTemplates(filters);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
      <Suspense fallback={null}>
        <TemplateFilters
          search={filters.search}
          status={filters.status}
          heading={
            <h2 className="text-xl font-semibold tracking-tight">
              WhatsApp templates
            </h2>
          }
          actions={<CreateTemplateDialog />}
        />
      </Suspense>

      <TemplatesTable templates={result.templates} filters={filters} />

      <TemplatesPagination
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        search={filters.search}
        status={filters.status}
      />
    </div>
  );
}
