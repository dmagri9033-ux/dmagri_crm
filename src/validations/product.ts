import { z } from "zod";

export const productFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Product name must be at least 2 characters")
    .max(120, "Product name is too long"),
  is_active: z.coerce.boolean().default(true),
});

export const productFilterSchema = z.object({
  search: z.string().trim().optional().default(""),
  status: z.enum(["all", "active", "inactive"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;
export type ProductFilterInput = z.infer<typeof productFilterSchema>;
