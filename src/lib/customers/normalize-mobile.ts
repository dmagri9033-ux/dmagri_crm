/**
 * India-friendly mobile normalization (aligned with DB trigger).
 * - Strip non-digits
 * - 10-digit local numbers → prefix 91
 * - 12-digit starting with 91 kept as-is
 */
export function normalizeMobile(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.length === 10) {
    return `91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits;
  }

  // Allow other lengths only if they look like a plausible phone (11–15 digits)
  if (digits.length >= 11 && digits.length <= 15) {
    return digits;
  }

  return null;
}

/** Display helper: show +91 XXXXX XXXXX when possible. */
export function formatMobileDisplay(mobile: string, normalized?: string | null): string {
  const digits = (normalized ?? mobile).replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return mobile;
}
