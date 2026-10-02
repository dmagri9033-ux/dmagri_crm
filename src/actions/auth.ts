"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/paths";
import {
  checkRateLimit,
  getClientRateLimitKey,
} from "@/lib/security/rate-limit";
import {
  forgotPasswordSchema,
  loginSchema,
  updatePasswordSchema,
} from "@/validations/auth";

export type AuthActionState = {
  error?: string;
  success?: string;
};

function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ||
    "http://localhost:3000"
  );
}

export async function loginAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const rateKey = await getClientRateLimitKey("login");
  const limited = checkRateLimit(rateKey, 10, 15 * 60_000);
  if (!limited.ok) {
    return {
      error: `Too many login attempts. Try again in ${limited.retryAfterSec}s.`,
    };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid credentials" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { error: "Invalid email or password" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, is_active, deleted_at")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError) {
    await supabase.auth.signOut();
    return { error: "Unable to verify account. Contact an administrator." };
  }

  if (!profile || profile.deleted_at) {
    await supabase.auth.signOut();
    return {
      error:
        "No CRM profile found for this account. Ask an administrator to provision your user.",
    };
  }

  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Your account is inactive. Contact an administrator." };
  }

  const next = getSafeRedirectPath(String(formData.get("next") || ""));
  redirect(next);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl()}/auth/callback?next=/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  // Always show success to avoid email enumeration.
  return {
    success:
      "If an account exists for that email, a password reset link has been sent.",
  };
}

export async function updatePasswordAction(
  _prev: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Your reset session expired. Request a new link." };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}
