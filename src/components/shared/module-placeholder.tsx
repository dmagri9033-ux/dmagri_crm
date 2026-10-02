import { Badge } from "@/components/ui/badge";
import { mainNavItems } from "@/lib/navigation";

type ModulePlaceholderProps = {
  href: string;
};

export function ModulePlaceholder({ href }: ModulePlaceholderProps) {
  const item = mainNavItems.find((nav) => nav.href === href);

  if (!item) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Module not found.
      </div>
    );
  }

  const Icon = item.icon;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 rounded-xl border bg-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{item.title}</h2>
          <p className="text-sm text-muted-foreground">Scaffold route only</p>
        </div>
      </div>
      <Badge variant="secondary">Implemented in Phase {item.phase}</Badge>
      <p className="text-sm text-muted-foreground">
        This page is a navigation placeholder from Phase 1. No business logic,
        mock data, or APIs are wired yet.
      </p>
    </div>
  );
}
