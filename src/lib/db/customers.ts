import { createClient } from "@/lib/supabase/server";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { administratorCreatorOrFilter } from "@/lib/rbac/administrator";
import type { Tables } from "@/types/database.types";
import {
  customerFilterSchema,
  type CustomerFilterInput,
} from "@/validations/customer";

export type Customer = Tables<"customers">;

export type CustomerWithProduct = Customer & {
  products: Pick<Tables<"products">, "id" | "name" | "is_active"> | null;
};

export type CustomerListResult = {
  customers: CustomerWithProduct[];
  total: number;
  page: number;
  pageSize: number;
};

function mapProductJoin(
  row: Customer & {
    products:
      | Pick<Tables<"products">, "id" | "name" | "is_active">
      | Pick<Tables<"products">, "id" | "name" | "is_active">[]
      | null;
  },
): CustomerWithProduct {
  const products = Array.isArray(row.products) ? row.products[0] ?? null : row.products;
  return { ...row, products };
}

export async function listCustomers(
  rawFilters: Partial<CustomerFilterInput> = {},
): Promise<CustomerListResult> {
  const filters = customerFilterSchema.parse(rawFilters);
  const [supabase, hideAdminCreated] = await Promise.all([
    createClient(),
    administratorCreatorOrFilter(),
  ]);

  let query = supabase
    .from("customers")
    .select(
      `
      *,
      products:primary_product_id ( id, name, is_active )
    `,
      { count: "exact" },
    )
    .is("deleted_at", null);

  if (filters.search) {
    const normalizedSearch = normalizeMobile(filters.search);
    if (normalizedSearch) {
      query = query.or(
        `name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%,mobile_normalized.eq.${normalizedSearch}`,
      );
    } else {
      query = query.or(
        `name.ilike.%${filters.search}%,mobile.ilike.%${filters.search}%`,
      );
    }
  }

  if (filters.productId) {
    query = query.eq("primary_product_id", filters.productId);
  }

  if (filters.customerType && filters.customerType !== "all") {
    query = query.eq("customer_type", filters.customerType);
  }

  if (filters.purchased === "yes") {
    query = query.eq("product_purchased", true);
  } else if (filters.purchased === "no") {
    query = query.eq("product_purchased", false);
  }

  if (filters.followUp === "yes") {
    query = query.eq("follow_up_required", true);
  } else if (filters.followUp === "no") {
    query = query.eq("follow_up_required", false);
  }

  if (hideAdminCreated) query = query.or(hideAdminCreated);

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await query
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    customers: (data ?? []).map((row) => mapProductJoin(row as never)),
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/** Unpaginated list for Excel export (capped). */
export async function listCustomersForExport(
  rawFilters: Partial<CustomerFilterInput> = {},
  limit = 5000,
): Promise<CustomerWithProduct[]> {
  const result = await listCustomers({
    ...rawFilters,
    page: 1,
    pageSize: Math.min(Math.max(limit, 5), 100),
  });

  if (result.total <= result.pageSize) {
    return result.customers;
  }

  const all = [...result.customers];
  const pages = Math.ceil(Math.min(result.total, limit) / result.pageSize);
  for (let page = 2; page <= pages; page += 1) {
    const chunk = await listCustomers({
      ...rawFilters,
      page,
      pageSize: result.pageSize,
    });
    all.push(...chunk.customers);
  }
  return all.slice(0, limit);
}

export async function getCustomerById(
  id: string,
): Promise<CustomerWithProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(
      `
      *,
      products:primary_product_id ( id, name, is_active )
    `,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapProductJoin(data as never);
}

export async function findCustomerByNormalizedMobile(
  mobileNormalized: string,
  excludeId?: string,
): Promise<Customer | null> {
  const supabase = await createClient();
  let query = supabase
    .from("customers")
    .select("*")
    .eq("mobile_normalized", mobileNormalized)
    .is("deleted_at", null)
    .maybeSingle();

  // maybeSingle with exclude: fetch then filter, or use neq
  if (excludeId) {
    query = supabase
      .from("customers")
      .select("*")
      .eq("mobile_normalized", mobileNormalized)
      .is("deleted_at", null)
      .neq("id", excludeId)
      .maybeSingle();
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}
