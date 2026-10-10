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

export async function createTemplateAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  try {
    const ctx = await authorize("template.create");
    const parsed = templateFormSchema.safeParse({
      name: formData.get("name"),
      content: formData.get("content"),
      is_active:
        formData.get("is_active") === "on" ||
        formData.get("is_active") === "true",
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
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "A template with this name already exists." };
      }
      throw new Error(error.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "TEMPLATE_CREATED",
      module: "templates",
      entityType: "whatsapp_template",
      entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidatePath("/templates");
    return { success: "Template created.", templateId: data.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateTemplateAction(
  _prev: TemplateActionState,
  formData: FormData,
): Promise<TemplateActionState> {
  try {
    const ctx = await authorize("template.update");
    const templateId = String(formData.get("templateId") || "");
    if (!templateId) return { error: "Missing template id" };

    const parsed = templateFormSchema.safeParse({
      name: formData.get("name"),
      content: formData.get("content"),
      is_active:
        formData.get("is_active") === "on" ||
        formData.get("is_active") === "true",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid template" };
    }

    const existing = await getWhatsAppTemplateById(templateId);
    if (!existing) return { error: "Template not found" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("whatsapp_templates")
      .update({
        name: parsed.data.name,
        content: parsed.data.content,
        is_active: parsed.data.is_active,
      })
      .eq("id", templateId)
      .is("deleted_at", null);

    if (error) {
      if (error.code === "23505") {
        return { error: "A template with this name already exists." };
      }
      throw new Error(error.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "TEMPLATE_UPDATED",
      module: "templates",
      entityType: "whatsapp_template",
      entityId: templateId,
      metadata: {
        name: parsed.data.name,
        is_active: parsed.data.is_active,
      },
    });

    revalidatePath("/templates");
    return { success: "Template updated.", templateId };
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
