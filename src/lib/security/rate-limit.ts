/**
 * Simple in-process rate limiter (single Node instance).
 * For multi-instance Vercel production, prefer Upstash — see docs/SECURITY.md.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  buckets.set(key, existing);
  return { ok: true };
}

/** Best-effort client key for server actions (IP / forwarded header). */
export async function getClientRateLimitKey(prefix: string): Promise<string> {
  try {
    const { headers } = await import("next/headers");
    const h = await headers();
    const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
    const realIp = h.get("x-real-ip")?.trim();
    const ip = forwarded || realIp || "unknown";
    return `${prefix}:${ip}`;
  } catch {
    return `${prefix}:unknown`;
  }
}
