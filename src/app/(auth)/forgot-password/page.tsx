import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="We'll email you a secure link to reset it."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
