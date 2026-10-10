import { collectPagesForExport } from "@/lib/db/export-pages";
import { createClient } from "@/lib/supabase/server";
import { administratorCreatorOrFilter } from "@/lib/rbac/administrator";
import type { Tables } from "@/types/database.types";
import {
  followupFilterSchema,
  type FollowupFilterInput,
} from "@/validations/followup";

export type ProfileLite = Pick<Tables<"profiles">, "id" | "display_name" | "email">;
export type CustomerLite = Pick<
  Tables<"customers">,
  "id" | "name" | "mobile" | "mobile_normalized" | "customer_type"
>;
export type InquiryLite = Pick<
  Tables<"inquiries">,
  | "id"
  | "inquiry_date"
  | "product_name_snapshot"
  | "customer_id"
  | "customer_type"
  | "product_id"
  | "product_purchased"
>;

export type FollowupWithRelations = Tables<"followups"> & {
  customers: CustomerLite | null;
  inquiries: InquiryLite | null;
  created_by_profile: ProfileLite | null;
};

export type FollowupListResult = {
  followups: FollowupWithRelations[];
  total: number;
  page: number;
  pageSize: number;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapFollowup(row: never): FollowupWithRelations {
  const r = row as Tables<"followups"> & {
    customers: CustomerLite | CustomerLite[] | null;
    inquiries: InquiryLite | InquiryLite[] | null;
    created_by_profile?: ProfileLite | ProfileLite[] | null;
  };
  return {
    ...r,
    customers: one(r.customers),
    inquiries: one(r.inquiries),
    created_by_profile: one(r.created_by_profile),
  };
}

const FOLLOWUP_SELECT = `
  *,
  customers:customer_id ( id, name, mobile, mobile_normalized, customer_type ),
  inquiries:inquiry_id (
    id,
    inquiry_date,
    product_name_snapshot,
    customer_id,
    customer_type,
    product_id,
    product_purchased
  ),
  created_by_profile:created_by ( id, display_name, email )
`;

export async function listFollowups(
  rawFilters: Partial<FollowupFilterInput> = {},
): Promise<FollowupListResult> {
  const filters = followupFilterSchema.parse(rawFilters);
  const [supabase, hideAdminCreated] = await Promise.all([
    createClient(),
    administratorCreatorOrFilter(),
  ]);

  let query = supabase
    .from("followups")
    .select(FOLLOWUP_SELECT, { count: "exact" })
    .is("deleted_at", null);

  if (filters.search) {
    const q = filters.search;
    const { data: matchedCustomers } = await supabase
      .from("customers")
      .select("id")
      .is("deleted_at", null)
      .or(`name.ilike.%${q}%,mobile.ilike.%${q}%,mobile_normalized.ilike.%${q}%`)
      .limit(50);

    const customerIds = (matchedCustomers ?? []).map((c) => c.id);
    if (customerIds.length > 0) {
      query = query.or(
        `notes.ilike.%${q}%,customer_id.in.(${customerIds.join(",")})`,
      );
    } else {
      query = query.ilike("notes", `%${q}%`);
    }
  }

  if (filters.dateFrom) {
    query = query.gte("followup_date", filters.dateFrom);
  }
  if (filters.dateTo) {
    query = query.lte("followup_date", filters.dateTo);
  }

  if (filters.customerId) {
    query = query.eq("customer_id", filters.customerId);
  }

  if (filters.customerType && filters.customerType !== "all") {
    const { data: typedCustomers, error: typeError } = await supabase
      .from("customers")
      .select("id")
      .eq("customer_type", filters.customerType)
      .is("deleted_at", null)
      .limit(500);
    if (typeError) throw new Error(typeError.message);
    const typeIds = (typedCustomers ?? []).map((c) => c.id);
    if (typeIds.length === 0) {
      return {
        followups: [],
        total: 0,
        page: filters.page,
        pageSize: filters.pageSize,
      };
    }
    query = query.in("customer_id", typeIds);
  }

  if (filters.linked === "yes") {
    query = query.not("inquiry_id", "is", null);
  } else if (filters.linked === "no") {
    query = query.is("inquiry_id", null);
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
    .order("followup_date", { ascending: false })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    followups: (data ?? []).map((row) => mapFollowup(row as never)),
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/** Unpaginated list for Excel export (capped). */
export async function listFollowupsForExport(
  rawFilters: Partial<FollowupFilterInput> = {},
  limit = 5000,
): Promise<FollowupWithRelations[]> {
  return collectPagesForExport({
    filters: rawFilters,
    limit,
    list: async (filters) => {
      const result = await listFollowups(filters);
      return {
        items: result.followups,
        total: result.total,
        pageSize: result.pageSize,
      };
    },
  });
}

export async function getFollowupById(
  id: string,
): Promise<FollowupWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("followups")
    .select(FOLLOWUP_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapFollowup(data as never);
}

/** Always INSERT — never reuse a row for a new conversation. */
export async function createFollowupRecord(input: {
  userId: string;
  followup_date: string;
  customer_id: string;
  inquiry_id?: string | null;
  notes: string;
}) {
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", input.customer_id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!customer) throw new Error("Customer not found");

  let inquiryId = input.inquiry_id?.trim() || null;
  if (inquiryId) {
    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("id, customer_id")
      .eq("id", inquiryId)
      .is("deleted_at", null)
      .maybeSingle();

    if (!inquiry) throw new Error("Inquiry not found");
    if (inquiry.customer_id !== input.customer_id) {
      throw new Error("Inquiry does not belong to this customer");
    }
  }

  const { data, error } = await supabase
    .from("followups")
    .insert({
      customer_id: input.customer_id,
      inquiry_id: inquiryId,
      followup_date: input.followup_date,
      notes: input.notes.trim(),
      created_by: input.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await supabase
    .from("customers")
    .update({ follow_up_required: false })
    .eq("id", input.customer_id);

  return data.id;
}
