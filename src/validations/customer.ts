import { z } from "zod";
import { customerNameHasDigits } from "@/lib/customers/customer-name";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";

export const CUSTOMER_TYPES = ["farmer", "dealer", "distributor", "other"] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const customerFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long")
    .refine((value) => !customerNameHasDigits(value), {
      message: "Customer name cannot include numbers",
    }),
  mobile: z
    .string()
    .trim()
    .min(8, "Enter a valid mobile number")
    .max(20, "Mobile number is too long")
    .refine((value) => normalizeMobile(value) !== null, {
      message: "Enter a valid 10-digit Indian mobile number",
    }),
  customer_type: z.enum(CUSTOMER_TYPES).nullable().optional(),
  primary_product_id: z.string().uuid().nullable().optional(),
  product_purchased: z.boolean().default(false),
  follow_up_required: z.boolean().default(false),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
});

export const customerFilterSchema = z.object({
  search: z.string().trim().optional().default(""),
  productId: z.string().uuid().optional().or(z.literal("")).default(""),
  customerType: z
    .enum(["all", "farmer", "dealer", "distributor", "other"])
    .optional()
    .default("all"),
  purchased: z.enum(["all", "yes", "no"]).optional().default("all"),
  followUp: z.enum(["all", "yes", "no"]).optional().default("all"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export type CustomerFormInput = z.infer<typeof customerFormSchema>;
export type CustomerFilterInput = z.infer<typeof customerFilterSchema>;
