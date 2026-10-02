import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.types";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { getSafeRedirectPath, isAuthPublicPath } from "@/lib/auth/paths";

/**
 * Refreshes Auth cookies and enforces route guards.
 * Inactive / missing profile checks also run in the (app) layout.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const { pathname, search } = request.nextUrl;

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return supabaseResponse;
  }

  const { url, anonKey } = getSupabasePublicConfig();

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isPublic =
    isAuthPublicPath(pathname) ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/_next");

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set(
      "next",
      getSafeRedirectPath(`${pathname}${search}`),
    );
    return NextResponse.redirect(loginUrl);
  }

  if (user && (pathname === "/login" || pathname === "/forgot-password")) {
    const dest = request.nextUrl.clone();
    dest.pathname = "/dashboard";
    dest.search = "";
    return NextResponse.redirect(dest);
  }

  return supabaseResponse;
}
