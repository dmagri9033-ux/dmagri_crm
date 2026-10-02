import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PermissionsProvider } from "@/components/providers/permissions-provider";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { listMyNotifications } from "@/lib/db/notifications";
import { getPermissionCodesForUser } from "@/lib/rbac/get-permissions";
import type { PermissionCode } from "@/lib/rbac/permissions";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();

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

  const [permissionSet, notificationData] = await Promise.all([
    getPermissionCodesForUser(user.id),
    listMyNotifications(25),
  ]);
  const permissions = [...permissionSet] as PermissionCode[];

  return (
    <PermissionsProvider permissions={permissions}>
      <AppShell
        user={{
          displayName: profile.display_name,
          email: profile.email,
          roleName: profile.roles?.name ?? "User",
        }}
        notifications={notificationData.notifications}
        unreadCount={notificationData.unreadCount}
      >
        {children}
      </AppShell>
    </PermissionsProvider>
  );
}
