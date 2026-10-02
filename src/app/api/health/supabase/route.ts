import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Dev-oriented health check for Supabase connectivity.
 * Uses the service-role client to count seed permissions (bypasses RLS).
 * Disabled in production.
 */
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message: "Supabase env vars are not set",
      },
      { status: 503 },
    );
  }

  try {
    const supabase = createAdminClient();
    const { count, error } = await supabase
      .from("permissions")
      .select("*", { count: "exact", head: true });

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          message: error.message,
          hint: "Apply supabase/migrations then run supabase/seed.sql in the SQL editor.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      permissionsCount: count ?? 0,
      seeded: (count ?? 0) > 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { ok: false, configured: true, message },
      { status: 503 },
    );
  }
}
