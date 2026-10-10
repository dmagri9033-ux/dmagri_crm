import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import {
  templateFilterSchema,
  type TemplateFilterInput,
} from "@/validations/template";

export type WhatsAppTemplate = Tables<"whatsapp_templates">;

export type TemplateListResult = {
  templates: WhatsAppTemplate[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listWhatsAppTemplates(
  rawFilters: Partial<TemplateFilterInput> = {},
): Promise<TemplateListResult> {
  const filters = templateFilterSchema.parse(rawFilters);
  const supabase = await createClient();

  let query = supabase
    .from("whatsapp_templates")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (filters.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,content.ilike.%${filters.search}%`,
    );
  }

  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    templates: data ?? [],
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

export async function listActiveWhatsAppTemplates(): Promise<WhatsAppTemplate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name", { ascending: true })
    .limit(200);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getWhatsAppTemplateById(
  id: string,
): Promise<WhatsAppTemplate | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("whatsapp_templates")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}
