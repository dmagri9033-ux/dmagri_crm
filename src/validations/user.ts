import { z } from "zod";

export const userCreateSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(120, "Display name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(254),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password is too long"),
  role_id: z.string().uuid("Select a role"),
  is_active: z.coerce.boolean().default(true),
});

export const userUpdateSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(120, "Display name is too long"),
  email: z.string().trim().email("Enter a valid email address").max(254),
  role_id: z.string().uuid("Select a role"),
  is_active: z.coerce.boolean().default(true),
});

export const userFilterSchema = z.object({
  search: z.string().trim().optional().default(""),
  status: z.enum(["all", "active", "inactive"]).optional().default("all"),
  role_id: z.union([z.string().uuid(), z.literal("")]).optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserFilterInput = z.infer<typeof userFilterSchema>;
