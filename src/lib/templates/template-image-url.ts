/** Public URL for an image in the whatsapp-templates bucket. */
export function getTemplateImageUrl(
  storagePath: string | null | undefined,
): string | null {
  if (!storagePath?.trim()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  if (!base) return null;
  const path = storagePath.replace(/^\/+/, "");
  return `${base}/storage/v1/object/public/whatsapp-templates/${path}`;
}
