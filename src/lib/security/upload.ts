import { MAX_UPLOAD_BYTES } from "@/lib/excel/workbook";

const XLSX_MIME = new Set([
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream",
  "application/zip",
]);

/** ZIP / OOXML local file header signature (xlsx is a zip). */
function hasZipMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
  );
}

export type UploadValidationResult =
  | { ok: true; buffer: Buffer }
  | { ok: false; error: string };

/**
 * Validate Excel upload before parse: size, extension, MIME, magic bytes.
 */
export async function validateXlsxUpload(file: File): Promise<UploadValidationResult> {
  if (!(file instanceof File)) {
    return { ok: false, error: "Choose an Excel (.xlsx) file" };
  }
  if (file.size <= 0) {
    return { ok: false, error: "File is empty" };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "File exceeds 5 MB limit" };
  }
  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    return { ok: false, error: "Only .xlsx files are supported" };
  }
  if (file.type && !XLSX_MIME.has(file.type)) {
    return { ok: false, error: "Unexpected file type for Excel upload" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasZipMagic(buffer)) {
    return {
      ok: false,
      error: "File is not a valid .xlsx workbook (bad format signature)",
    };
  }

  return { ok: true, buffer };
}
