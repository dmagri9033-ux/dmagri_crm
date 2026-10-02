import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/features/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <AuthShell
      title="Set a new password"
      description="Choose a strong password for your CRM account."
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
