import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { listMyNotifications } from "@/lib/db/notifications";
import { getSessionContext } from "@/lib/rbac/authorize";
import { UnauthorizedError } from "@/lib/rbac/errors";
import type { PermissionCode } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

async function LayoutNotifications() {
  const data = await listMyNotifications(25);
  return (
    <NotificationBell
      notifications={data.notifications}
      unreadCount={data.unreadCount}
    />
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let ctx;
  try {
    ctx = await getSessionContext();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      if (
        error.message === "MISSING_PROFILE" ||
        error.message === "INACTIVE_PROFILE"
      ) {
        const supabase = await createClient();
        await supabase.auth.signOut();
        const message =
          error.message === "INACTIVE_PROFILE"
            ? "Your account is inactive. Contact an administrator."
            : "No CRM profile found for this account. Ask an administrator to provision your user.";
        redirect(`/login?error=${encodeURIComponent(message)}`);
      }
      redirect("/login");
    }
    throw error;
  }

  const { profile } = ctx;
  const permissions = [...ctx.permissions] as PermissionCode[];

  return (
    <PermissionsProvider permissions={permissions}>
      <AppShell
        user={{
          displayName: profile.display_name,
          email: profile.email,
          roleName: profile.roles?.name ?? "User",
        }}
        notifications={
          <Suspense
            fallback={<NotificationBell notifications={[]} unreadCount={0} />}
          >
            <LayoutNotifications />
          </Suspense>
        }
      >
        {children}
      </AppShell>
    </PermissionsProvider>
  );
}
