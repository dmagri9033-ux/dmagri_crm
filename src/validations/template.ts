import { z } from "zod";

export const templateFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Template name must be at least 2 characters")
    .max(120, "Template name is too long"),
  content: z
    .string()
    .trim()
    .min(1, "Message content is required")
    .max(4096, "Message is too long for WhatsApp"),
  is_active: z.coerce.boolean().default(true),
});

export const templateFilterSchema = z.object({
  search: z.string().trim().optional().default(""),
  status: z.enum(["all", "active", "inactive"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export type TemplateFormInput = z.infer<typeof templateFormSchema>;
export type TemplateFilterInput = z.infer<typeof templateFilterSchema>;
