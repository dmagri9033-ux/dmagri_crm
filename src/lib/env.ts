import { z } from "zod";

/** Treat empty strings from .env files as undefined. */
function emptyToUndefined(value: unknown): unknown {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }
  return value;
}

/**
 * Public env vars available in browser and server.
 * Validated lazily so the app can boot before Phase 2 Supabase setup.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  NEXT_PUBLIC_APP_URL: z.preprocess(
    emptyToUndefined,
    z.string().url().optional(),
  ),
});

/**
 * Server-only secrets. Never import this module from Client Components.
 * SUPABASE_SERVICE_ROLE_KEY must never use a NEXT_PUBLIC_ prefix.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
  CRON_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(1).optional(),
  ),
});

export type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

export type ServerEnv = {
  SUPABASE_SERVICE_ROLE_KEY?: string;
  CRON_SECRET?: string;
};

export function getPublicEnv(): PublicEnv {
  return publicEnvSchema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  }) as PublicEnv;
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
  }) as ServerEnv;
}

/** Returns true when Supabase public credentials are configured. */
export function isSupabaseConfigured(): boolean {
  const env = getPublicEnv();
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
