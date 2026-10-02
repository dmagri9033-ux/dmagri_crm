import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ForbiddenState({
  title = "Access denied",
  description = "You do not have permission to view this page.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-start gap-4 rounded-xl border bg-card p-6">
      <div className="flex size-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
        <ShieldAlert className="size-5" aria-hidden />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button render={<Link href="/dashboard" />} nativeButton={false} variant="outline">
        Back to dashboard
      </Button>
    </div>
  );
}
