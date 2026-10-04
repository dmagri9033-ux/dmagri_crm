import { z } from "zod";

export const followupStatusFilterValues = ["open", "completed", "all"] as const;

export const followupFormSchema = z.object({
  followup_date: z.string().min(1, "Date is required"),
  customer_id: z.string().uuid("Select a customer"),
  inquiry_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  notes: z.string().trim().min(1, "Notes are required").max(10000),
});

export const followupFilterSchema = z.object({
  search: z.string().trim().optional().default(""),
  dateFrom: z.string().optional().default(""),
  dateTo: z.string().optional().default(""),
  customerId: z.string().uuid().optional().or(z.literal("")).default(""),
  customerType: z
    .enum(["all", "farmer", "dealer", "distributor", "other"])
    .optional()
    .default("all"),
  linked: z.enum(["all", "yes", "no"]).optional().default("all"),
  status: z.enum(followupStatusFilterValues).optional().default("open"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export type FollowupFormInput = z.infer<typeof followupFormSchema>;
export type FollowupFilterInput = z.infer<typeof followupFilterSchema>;
