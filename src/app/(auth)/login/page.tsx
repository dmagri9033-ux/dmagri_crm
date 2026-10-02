import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/features/auth/login-form";
import { getSafeRedirectPath } from "@/lib/auth/paths";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const nextPath = getSafeRedirectPath(params.next);
  const initialError = params.error;

  return (
    <AuthShell
      title="Welcome back"
      description="Sign in to access the DM Agree CRM."
    >
      <LoginForm nextPath={nextPath} initialError={initialError} />
    </AuthShell>
  );
}
