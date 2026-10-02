import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">Your profile</h2>
        <p className="text-sm text-muted-foreground">
          Account details from CRM. Passwords are managed by Supabase Auth and
          are never stored in the profiles table.
        </p>
      </div>

      <Separator />

      <dl className="space-y-4 rounded-xl border bg-card p-5 text-sm">
        <div>
          <dt className="text-muted-foreground">Name</dt>
          <dd className="mt-1 font-medium">{profile.display_name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="mt-1 font-medium">{profile.email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Role</dt>
          <dd className="mt-1 font-medium">{profile.roles?.name ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="mt-1">
            <Badge variant={profile.is_active ? "secondary" : "outline"}>
              {profile.is_active ? "Active" : "Inactive"}
            </Badge>
          </dd>
        </div>
      </dl>
    </div>
  );
}
