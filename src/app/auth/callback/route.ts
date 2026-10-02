import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSafeRedirectPath } from "@/lib/auth/paths";

/**
 * Handles Supabase Auth email redirects (password recovery, etc.).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = getSafeRedirectPath(searchParams.get("next"), "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not complete authentication. Try again.")}`,
  );
}
