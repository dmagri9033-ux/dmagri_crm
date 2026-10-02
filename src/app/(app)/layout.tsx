import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { NotificationBell } from "@/components/layout/notification-bell";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { getAuthUser } from "@/lib/auth/session";
import { listMyNotifications } from "@/lib/db/notifications";
import { getPermissionCodesForRole } from "@/lib/rbac/get-permissions";
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
  const user = await getAuthUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  const supabase = await createClient();

  if (!profile || profile.deleted_at) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(
        "No CRM profile found for this account. Ask an administrator to provision your user.",
      )}`,
    );
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    redirect(
      `/login?error=${encodeURIComponent(
        "Your account is inactive. Contact an administrator.",
      )}`,
    );
  }

  const permissionSet = await getPermissionCodesForRole(profile.role_id);
  const permissions = [...permissionSet] as PermissionCode[];

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
