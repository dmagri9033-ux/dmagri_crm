import { createClient } from "@/lib/supabase/server";
import { administratorCreatorOrFilter } from "@/lib/rbac/administrator";
import type { Tables } from "@/types/database.types";
import {
  inquiryFilterSchema,
  type InquiryFilterInput,
} from "@/validations/inquiry";

export type ProfileLite = Pick<Tables<"profiles">, "id" | "display_name" | "email">;
export type ProductLite = Pick<Tables<"products">, "id" | "name" | "is_active">;
export type CustomerLite = Pick<
  Tables<"customers">,
  "id" | "name" | "mobile" | "mobile_normalized" | "customer_type"
>;

export type InquiryWithRelations = Tables<"inquiries"> & {
  customers: CustomerLite | null;
  products: ProductLite | null;
  created_by_profile: ProfileLite | null;
};

export type InquiryListResult = {
  inquiries: InquiryWithRelations[];
  total: number;
  page: number;
  pageSize: number;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapInquiry(row: never): InquiryWithRelations {
  const r = row as Tables<"inquiries"> & {
    customers: CustomerLite | CustomerLite[] | null;
    products: ProductLite | ProductLite[] | null;
    created_by_profile: ProfileLite | ProfileLite[] | null;
  };
  return {
    ...r,
    customers: one(r.customers),
    products: one(r.products),
    created_by_profile: one(r.created_by_profile),
  };
}

/** Lighter join for list/grid — omit created_by_profile (unused in tables). */
const INQUIRY_LIST_SELECT = `
  *,
  customers:customer_id ( id, name, mobile, mobile_normalized, customer_type ),
  products:product_id ( id, name, is_active )
`;

const INQUIRY_SELECT = `
  *,
  customers:customer_id ( id, name, mobile, mobile_normalized, customer_type ),
  products:product_id ( id, name, is_active ),
  created_by_profile:created_by ( id, display_name, email )
`;

export async function listInquiries(
  rawFilters: Partial<InquiryFilterInput> = {},
): Promise<InquiryListResult> {
  const filters = inquiryFilterSchema.parse(rawFilters);
  const [supabase, hideAdminCreated] = await Promise.all([
    createClient(),
    administratorCreatorOrFilter(),
  ]);

  let query = supabase
    .from("inquiries")
    .select(INQUIRY_LIST_SELECT, { count: "exact" })
    .is("deleted_at", null);

  if (filters.search) {
    query = query.or(
      `customer_name_snapshot.ilike.%${filters.search}%,mobile_snapshot.ilike.%${filters.search}%,remarks.ilike.%${filters.search}%,product_name_snapshot.ilike.%${filters.search}%`,
    );
  }

  if (filters.dateFrom) {
    query = query.gte("inquiry_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("inquiry_date", filters.dateTo);
  }

  if (filters.customerType !== "all") {
    query = query.eq("customer_type", filters.customerType);
  }

  if (filters.productId) {
    query = query.eq("product_id", filters.productId);
  }

  if (filters.purchased === "yes") {
    query = query.eq("product_purchased", true);
  } else if (filters.purchased === "no") {
    query = query.eq("product_purchased", false);
  }

  if (filters.status === "open") {
    query = query.is("completed_at", null);
  } else if (filters.status === "completed") {
    query = query.not("completed_at", "is", null);
  }

  if (hideAdminCreated) query = query.or(hideAdminCreated);

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await query
    .order("inquiry_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    inquiries: (data ?? []).map((row) => mapInquiry(row as never)),
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/** Unpaginated list for Excel export (capped). */
export async function listInquiriesForExport(
  rawFilters: Partial<InquiryFilterInput> = {},
  limit = 5000,
): Promise<InquiryWithRelations[]> {
  const result = await listInquiries({
    ...rawFilters,
    page: 1,
    pageSize: Math.min(Math.max(limit, 5), 100),
  });

  if (result.total <= result.pageSize) {
    return result.inquiries;
  }

  // Fetch remaining pages when total exceeds max pageSize schema allows
  const all = [...result.inquiries];
  const pages = Math.ceil(Math.min(result.total, limit) / result.pageSize);
  for (let page = 2; page <= pages; page += 1) {
    const chunk = await listInquiries({
      ...rawFilters,
      page,
      pageSize: result.pageSize,
    });
    all.push(...chunk.inquiries);
  }
  return all.slice(0, limit);
}

export async function getInquiryById(
  id: string,
): Promise<InquiryWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select(INQUIRY_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapInquiry(data as never);
}

/** Grid save path — same joins as list (no creator profile). */
export async function getInquiryForGrid(
  id: string,
): Promise<InquiryWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select(INQUIRY_LIST_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapInquiry(data as never);
}

/** Sync purchase table + customer flag when inquiry purchased state changes. */
export async function syncInquiryPurchase(input: {
  inquiryId: string;
  customerId: string;
  productId: string;
  purchased: boolean;
  purchasedAt: string;
}) {
  const supabase = await createClient();

  if (input.purchased) {
    const { data: existing } = await supabase
      .from("customer_product_purchases")
      .select("id")
      .eq("inquiry_id", input.inquiryId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("customer_product_purchases")
        .update({
          is_purchased: true,
          purchased_at: input.purchasedAt,
          product_id: input.productId,
        })
        .eq("id", existing.id);
    } else {
      const { error } = await supabase.from("customer_product_purchases").insert({
        customer_id: input.customerId,
        product_id: input.productId,
        inquiry_id: input.inquiryId,
        purchased_at: input.purchasedAt,
        is_purchased: true,
      });
      if (error && error.code !== "23505") throw new Error(error.message);
    }

    await supabase
      .from("customers")
      .update({ product_purchased: true })
      .eq("id", input.customerId);
  } else {
    await supabase
      .from("customer_product_purchases")
      .update({ is_purchased: false })
      .eq("inquiry_id", input.inquiryId);

    const { count } = await supabase
      .from("customer_product_purchases")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", input.customerId)
      .eq("is_purchased", true);

    if ((count ?? 0) === 0) {
      await supabase
        .from("customers")
        .update({ product_purchased: false })
        .eq("id", input.customerId);
    }
  }
}

export async function createInquiryRecord(input: {
  userId: string;
  inquiry_date: string;
  customer_id: string;
  product_id?: string | null;
  customer_type?: string | null;
  product_purchased: boolean;
  remarks?: string | null;
}) {
  const supabase = await createClient();
  const productId = input.product_id || null;

  const [{ data: product }, { data: customer }] = await Promise.all([
    productId
      ? supabase.from("products").select("name").eq("id", productId).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("customers")
      .select("name, mobile, customer_type")
      .eq("id", input.customer_id)
      .is("deleted_at", null)
      .maybeSingle(),
  ]);

  if (!customer) {
    throw new Error("Customer not found");
  }

  const purchased = Boolean(input.product_purchased && productId);

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      inquiry_date: input.inquiry_date,
      customer_id: input.customer_id,
      product_id: productId,
      customer_type: input.customer_type || customer.customer_type || null,
      product_purchased: purchased,
      remarks: input.remarks?.trim() || null,
      created_by: input.userId,
      assigned_user_id: input.userId,
      customer_name_snapshot: customer.name,
      mobile_snapshot: customer.mobile,
      product_name_snapshot: product?.name ?? null,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (purchased && productId) {
    await syncInquiryPurchase({
      inquiryId: data.id,
      customerId: input.customer_id,
      productId,
      purchased: true,
      purchasedAt: input.inquiry_date,
    });
  }

  return data.id;
}
