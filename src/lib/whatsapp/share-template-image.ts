/** Same-origin proxy so the browser can share/download the file (no CORS issues). */
export function templateImageProxyUrl(templateId: string): string {
  return `/api/templates/${encodeURIComponent(templateId)}/image`;
}

function extensionFromMime(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function fetchTemplateImageFile(
  templateId: string,
  fileNameBase = "whatsapp-template",
): Promise<File> {
  const res = await fetch(templateImageProxyUrl(templateId), {
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error("Could not load template image");
  }
  const blob = await res.blob();
  const mime = blob.type || "image/jpeg";
  const safeBase = fileNameBase.replace(/[^\w\-]+/g, "_").slice(0, 80) || "template";
  return new File([blob], `${safeBase}.${extensionFromMime(mime)}`, {
    type: mime,
  });
}

export function canShareFiles(file: File): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  if (typeof navigator.canShare !== "function") return false;
  try {
    return navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

/** Opens the system share sheet with the image (and optional text) — pick WhatsApp to attach. */
export async function shareImageToWhatsApp(input: {
  file: File;
  text?: string;
}): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!canShareFiles(input.file)) return "unsupported";
  try {
    const data: ShareData = {
      files: [input.file],
      title: "WhatsApp",
    };
    const text = input.text?.trim();
    if (text) data.text = text;
    await navigator.share(data);
    return "shared";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return "cancelled";
    }
    return "unsupported";
  }
}

export async function copyImageToClipboard(file: File): Promise<boolean> {
  try {
    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      return false;
    }
    const mime = file.type || "image/png";
    // Clipboard image paste usually expects image/png.
    let blob: Blob = file;
    if (mime !== "image/png") {
      blob = await convertImageFileToPng(file);
    }
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function convertImageFileToPng(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("PNG convert failed"))),
      "image/png",
    );
  });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000);
}
