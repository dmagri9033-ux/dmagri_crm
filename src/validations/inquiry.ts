import { z } from "zod";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { CUSTOMER_TYPES } from "@/validations/customer";

/** Add/edit inquiry: only customer mobile is required. */
export const inquiryStatusFilterValues = ["open", "completed", "all"] as const;

export const inquiryFormSchema = z.object({
  mobile: z
    .string()
    .trim()
    .min(1, "Customer number is required")
    .refine((value) => normalizeMobile(value) !== null, {
      message: "Enter a valid 10-digit Indian mobile number",
    }),
  customer_name: z
    .string()
    .trim()
    .max(120, "Name is too long")
    .optional()
    .or(z.literal("")),
  inquiry_date: z.string().optional().or(z.literal("")),
  product_id: z.preprocess(
    (value) => (value === "" || value == null ? null : value),
    z.string().uuid().nullable(),
  ),
  customer_type: z.enum(CUSTOMER_TYPES).nullable().optional(),
  product_purchased: z.boolean().default(false),
  remarks: z.string().trim().max(5000).optional().or(z.literal("")),
});

export const inquiryFilterSchema = z.object({
  search: z.string().trim().optional().default(""),
  dateFrom: z.string().optional().default(""),
  dateTo: z.string().optional().default(""),
  customerType: z
    .enum(["all", "farmer", "dealer", "distributor", "other"])
    .optional()
    .default("all"),
  productId: z.string().uuid().optional().or(z.literal("")).default(""),
  purchased: z.enum(["all", "yes", "no"]).optional().default("all"),
  status: z.enum(inquiryStatusFilterValues).optional().default("open"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(200).optional().default(100),
});

export type InquiryFormInput = z.infer<typeof inquiryFormSchema>;
export type InquiryFilterInput = z.infer<typeof inquiryFilterSchema>;
