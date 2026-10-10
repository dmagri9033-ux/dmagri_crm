"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import {
  getWhatsAppTemplateById,
  listActiveWhatsAppTemplates,
  listWhatsAppTemplates,
  type WhatsAppTemplate,
} from "@/lib/db/templates";
import { getTemplateImageUrl } from "@/lib/templates/template-image-url";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { createClient } from "@/lib/supabase/server";
import {
  templateFilterSchema,
  templateFormSchema,
  type TemplateFilterInput,
} from "@/validations/template";

const TEMPLATE_BUCKET = "whatsapp-templates";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type TemplateActionState = {
  error?: string;
  success?: string;
  templateId?: string;
};

export type TemplateGridResult = {
  error?: string;
  success?: string;
  templateId?: string;
  template?: WhatsAppTemplate;
  templates?: WhatsAppTemplate[];
  total?: number;
};

function sanitizeFileExt(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "bin";
}

async function uploadTemplateImage(
  templateId: string,
  file: File,
): Promise<string> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Image must be JPEG, PNG, WebP, or GIF");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image must be 5 MB or smaller");
  }

  const supabase = await createClient();
  const ext = sanitizeFileExt(file.type);
  const path = `${templateId}/cover.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(TEMPLATE_BUCKET)
    .upload(path, buffer, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw new Error(error.message);
  return path;
}

export async function loadTemplatesGridAction(
  rawFilters: Partial<TemplateFilterInput> = {},
): Promise<TemplateGridResult> {
  try {
    await authorize("template.view");
    const result = await listWhatsAppTemplates(rawFilters);
    return {
      templates: result.templates,
      total: result.total,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function loadWhatsAppTemplateOptionsAction(): Promise<{
  error?: string;
  templates?: {
    id: string;
    name: string;
    content: string;
    imageUrl: string | null;
  }[];
}> {
  try {
    await authorize("customer.view");
    const rows = await listActiveWhatsAppTemplates();
    return {
      templates: rows.map((t) => ({
        id: t.id,
        name: t.name,
        content: t.content,
        imageUrl: getTemplateImageUrl(t.image_storage_path),
      })),
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createTemplateGridRowAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateGridResult> {
  try {
    const ctx = await authorize("template.create");
    const parsed = templateFormSchema.safeParse({
      name: formData.get("name"),
      content: formData.get("content"),
      is_active: formData.get("is_active") === "true",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid template" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("whatsapp_templates")
      .insert({
        name: parsed.data.name,
        content: parsed.data.content,
        is_active: parsed.data.is_active,
        created_by: ctx.userId,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "A template with this name already exists." };
      }
      throw new Error(error.message);
    }

    let imagePath: string | null = null;
    const imageFile = formData.get("image");
    if (imageFile instanceof File && imageFile.size > 0) {
      imagePath = await uploadTemplateImage(data.id, imageFile);
      const { error: updateError } = await supabase
        .from("whatsapp_templates")
        .update({ image_storage_path: imagePath })
        .eq("id", data.id);
      if (updateError) throw new Error(updateError.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "TEMPLATE_CREATED",
      module: "templates",
      entityType: "whatsapp_template",
      entityId: data.id,
      metadata: { name: parsed.data.name, hasImage: Boolean(imagePath) },
    });

    revalidatePath("/templates");
    const refreshed = await getWhatsAppTemplateById(data.id);
    return {
      success: "Template created.",
      templateId: data.id,
      template: refreshed ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchTemplateFieldAction(input: {
  templateId: string;
  field: "name" | "content" | "is_active";
  value: string;
}): Promise<TemplateGridResult> {
  try {
    await authorize("template.update");
    const existing = await getWhatsAppTemplateById(input.templateId);
    if (!existing) return { error: "Template not found" };

    const supabase = await createClient();
    const patch: Partial<WhatsAppTemplate> = {};

    if (input.field === "name") {
      const name = input.value.trim();
      if (name.length < 2) return { error: "Name is too short" };
      patch.name = name;
    } else if (input.field === "content") {
      const content = input.value.trim();
      if (!content) return { error: "Content is required" };
      if (content.length > 4096) return { error: "Content is too long" };
      patch.content = content;
    } else if (input.field === "is_active") {
      patch.is_active = input.value === "true";
    } else {
      return { error: "Unknown field" };
    }

    const { error } = await supabase
      .from("whatsapp_templates")
      .update(patch)
      .eq("id", input.templateId)
      .is("deleted_at", null);

    if (error) {
      if (error.code === "23505") {
        return { error: "A template with this name already exists." };
      }
      throw new Error(error.message);
    }

    revalidatePath("/templates");
    const refreshed = await getWhatsAppTemplateById(input.templateId);
    return { success: "Saved", template: refreshed ?? undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function uploadTemplateImageAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateGridResult> {
  try {
    await authorize("template.update");
    const templateId = String(formData.get("templateId") || "");
    if (!templateId) return { error: "Missing template id" };

    const file = formData.get("image");
    if (!(file instanceof File) || file.size === 0) {
      return { error: "Choose an image file" };
    }

    const path = await uploadTemplateImage(templateId, file);
    const supabase = await createClient();
    const { error } = await supabase
      .from("whatsapp_templates")
      .update({ image_storage_path: path })
      .eq("id", templateId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    revalidatePath("/templates");
    const refreshed = await getWhatsAppTemplateById(templateId);
    return { success: "Image updated.", template: refreshed ?? undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteTemplateAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  try {
    const ctx = await authorize("template.delete");
    const templateId = String(formData.get("templateId") || "");
    if (!templateId) return { error: "Missing template id" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("whatsapp_templates")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", templateId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "TEMPLATE_DELETED",
      module: "templates",
      entityType: "whatsapp_template",
      entityId: templateId,
    });

    revalidatePath("/templates");
    return { success: "Template deleted." };
  } catch (error) {
    return toActionError(error);
  }
}
