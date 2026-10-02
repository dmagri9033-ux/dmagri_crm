import { normalizeMobile } from "@/lib/customers/normalize-mobile";

/** E.164 digits for wa.me (no + prefix). */
export function whatsAppPhoneDigits(raw: string): string | null {
  return normalizeMobile(raw);
}

export function buildWhatsAppWebUrl(mobile: string, message: string): string | null {
  const phone = whatsAppPhoneDigits(mobile);
  if (!phone) return null;
  const text = message.trim();
  const base = `https://wa.me/${phone}`;
  if (!text) return base;
  return `${base}?text=${encodeURIComponent(text)}`;
}
