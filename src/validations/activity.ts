import { z } from "zod";

export const ACTIVITY_MODULES = [
  "all",
  "customers",
  "inquiries",
  "followups",
  "reminders",
  "products",
  "roles",
  "users",
  "notes",
] as const;

export const activityFilterSchema = z.object({
  search: z.string().trim().optional().default(""),
  module: z.enum(ACTIVITY_MODULES).optional().default("all"),
  action: z.string().trim().optional().default(""),
  actorId: z.string().uuid().optional().or(z.literal("")).default(""),
  customerId: z.string().uuid().optional().or(z.literal("")).default(""),
  dateFrom: z.string().optional().default(""),
  dateTo: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export type ActivityFilterInput = z.infer<typeof activityFilterSchema>;
