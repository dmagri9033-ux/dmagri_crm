/**
 * Safe internal redirect paths only (prevent open redirects).
 */
export function getSafeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!candidate) return fallback;
  if (!candidate.startsWith("/")) return fallback;
  if (candidate.startsWith("//")) return fallback;
  if (candidate.includes("://")) return fallback;
  return candidate;
}

export const AUTH_PUBLIC_PATHS = [
  "/login",
  "/forgot-password",
  "/update-password",
  "/auth/callback",
] as const;

export function isAuthPublicPath(pathname: string): boolean {
  return AUTH_PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
