import { z } from "zod";
import { CUSTOMER_TYPES } from "@/validations/customer";

export const inquiryFormSchema = z.object({
  inquiry_date: z.string().min(1, "Date is required"),
  customer_id: z.string().uuid("Select a customer"),
  product_id: z.string().uuid("Select a product"),
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
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export type InquiryFormInput = z.infer<typeof inquiryFormSchema>;
export type InquiryFilterInput = z.infer<typeof inquiryFilterSchema>;
