import { collectPagesForExport } from "@/lib/db/export-pages";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import {
  productFilterSchema,
  type ProductFilterInput,
} from "@/validations/product";

export type Product = Tables<"products">;

export type ProductListResult = {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listProducts(
  rawFilters: Partial<ProductFilterInput> = {},
): Promise<ProductListResult> {
  const filters = productFilterSchema.parse(rawFilters);
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .is("deleted_at", null);

  if (filters.search) {
    query = query.ilike("name", `%${filters.search}%`);
  }

  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    products: data ?? [],
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/** Unpaginated list for Excel export (capped). */
export async function listProductsForExport(
  rawFilters: Partial<ProductFilterInput> = {},
  limit = 5000,
): Promise<Product[]> {
  return collectPagesForExport({
    filters: rawFilters,
    limit,
    list: async (filters) => {
      const result = await listProducts(filters);
      return {
        items: result.products,
        total: result.total,
        pageSize: result.pageSize,
      };
    },
  });
}

/** Active, non-deleted products for inquiry/customer pickers. */
export async function listActiveProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .is("deleted_at", null)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export type ProductReferenceCounts = {
  customers: number;
  inquiries: number;
  purchases: number;
  total: number;
};

export async function getProductReferenceCounts(
  productId: string,
): Promise<ProductReferenceCounts> {
  const supabase = await createClient();

  const [customers, inquiries, purchases] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("primary_product_id", productId)
      .is("deleted_at", null),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId)
      .is("deleted_at", null),
    supabase
      .from("customer_product_purchases")
      .select("id", { count: "exact", head: true })
      .eq("product_id", productId),
  ]);

  if (customers.error) throw new Error(customers.error.message);
  if (inquiries.error) throw new Error(inquiries.error.message);
  if (purchases.error) throw new Error(purchases.error.message);

  const customerCount = customers.count ?? 0;
  const inquiryCount = inquiries.count ?? 0;
  const purchaseCount = purchases.count ?? 0;

  return {
    customers: customerCount,
    inquiries: inquiryCount,
    purchases: purchaseCount,
    total: customerCount + inquiryCount + purchaseCount,
  };
}
