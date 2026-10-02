import Link from "next/link";
import { Sprout } from "lucide-react";

export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_top,_oklch(0.97_0.02_145),_oklch(0.98_0_0)_55%)]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-foreground text-background">
            <Sprout className="size-5" aria-hidden />
          </div>
          <Link href="/login" className="text-lg font-semibold tracking-tight">
            DM Agree CRM
          </Link>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
