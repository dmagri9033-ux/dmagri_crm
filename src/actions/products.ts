"use server";

import { revalidatePath, updateTag } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import {
  ACTIVE_PRODUCTS_CACHE_TAG,
  getProductById,
  getProductReferenceCounts,
  listProducts,
  type Product,
} from "@/lib/db/products";

function revalidateProductCaches() {
  revalidatePath("/products");
  // Immediate expire so pickers on inquiries/customers see new products on Vercel.
  updateTag(ACTIVE_PRODUCTS_CACHE_TAG);
}
import { createClient } from "@/lib/supabase/server";
import {
  productFilterSchema,
  productFormSchema,
  type ProductFilterInput,
} from "@/validations/product";

export type ProductActionState = {
  error?: string;
  success?: string;
  productId?: string;
};

export type ProductGridResult = {
  error?: string;
  success?: string;
  productId?: string;
  product?: Product;
  products?: Product[];
  total?: number;
};

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const ctx = await authorize("product.create");

    const parsed = productFormSchema.safeParse({
      name: formData.get("name"),
      is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid product" };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        name: parsed.data.name,
        is_active: parsed.data.is_active,
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "A product with this name already exists." };
      }
      throw new Error(error.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "PRODUCT_CREATED",
      module: "products",
      entityType: "product",
      entityId: data.id,
      metadata: { name: parsed.data.name },
    });

    revalidateProductCaches();
    return { success: "Product created.", productId: data.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const ctx = await authorize("product.update");

    const productId = String(formData.get("productId") || "");
    if (!productId) return { error: "Missing product id" };

    const parsed = productFormSchema.safeParse({
      name: formData.get("name"),
      is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid product" };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({
        name: parsed.data.name,
        is_active: parsed.data.is_active,
      })
      .eq("id", productId)
      .is("deleted_at", null);

    if (error) {
      if (error.code === "23505") {
        return { error: "A product with this name already exists." };
      }
      throw new Error(error.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "PRODUCT_UPDATED",
      module: "products",
      entityType: "product",
      entityId: productId,
      metadata: { name: parsed.data.name, is_active: parsed.data.is_active },
    });

    revalidateProductCaches();
    return { success: "Product updated.", productId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function setProductActiveAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const ctx = await authorize("product.update");

    const productId = String(formData.get("productId") || "");
    const nextActive = formData.get("is_active") === "true";

    if (!productId) return { error: "Missing product id" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({ is_active: nextActive })
      .eq("id", productId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "PRODUCT_UPDATED",
      module: "products",
      entityType: "product",
      entityId: productId,
      metadata: { is_active: nextActive, via: "toggle_active" },
    });

    revalidateProductCaches();
    return {
      success: nextActive ? "Product activated." : "Product deactivated.",
      productId,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  try {
    const ctx = await authorize("product.delete");

    const productId = String(formData.get("productId") || "");
    if (!productId) return { error: "Missing product id" };

    const refs = await getProductReferenceCounts(productId);
    if (refs.total > 0) {
      return {
        error: `Cannot delete: used by ${refs.customers} customer(s), ${refs.inquiries} inquiry(ies), ${refs.purchases} purchase record(s). Deactivate it instead.`,
      };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("products")
      .update({
        deleted_at: new Date().toISOString(),
        is_active: false,
      })
      .eq("id", productId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "PRODUCT_DELETED",
      module: "products",
      entityType: "product",
      entityId: productId,
    });

    revalidateProductCaches();
    return { success: "Product deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function loadProductsGridAction(
  rawFilters: Partial<ProductFilterInput> = {},
): Promise<ProductGridResult> {
  try {
    await authorize("product.view");
    const filters = productFilterSchema.parse(rawFilters);
    const result = await listProducts(filters);
    return { products: result.products, total: result.total };
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchProductFieldAction(input: {
  productId: string;
  field: "name" | "is_active";
  value: string;
}): Promise<ProductGridResult> {
  try {
    const ctx = await authorize("product.update");
    const existing = await getProductById(input.productId);
    if (!existing) return { error: "Product not found" };

    const supabase = await createClient();
    const patch: { name?: string; is_active?: boolean } = {};

    if (input.field === "name") {
      const name = input.value.trim();
      if (name.length < 2) return { error: "Name must be at least 2 characters" };
      patch.name = name;
    } else if (input.field === "is_active") {
      patch.is_active = input.value === "true";
    }

    const { error } = await supabase
      .from("products")
      .update(patch)
      .eq("id", input.productId)
      .is("deleted_at", null);

    if (error) {
      if (error.code === "23505") {
        return { error: "A product with this name already exists." };
      }
      throw new Error(error.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "PRODUCT_UPDATED",
      module: "products",
      entityType: "product",
      entityId: input.productId,
      metadata: { field: input.field, via: "grid" },
    });

    revalidateProductCaches();
    const product = await getProductById(input.productId);
    return { success: "Saved", productId: input.productId, product: product ?? undefined };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createProductGridRowAction(input: {
  name: string;
  is_active?: boolean;
}): Promise<ProductGridResult> {
  try {
    const ctx = await authorize("product.create");
    const name = input.name.trim();
    if (name.length < 2) return { error: "Enter a product name" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("products")
      .insert({
        name,
        is_active: input.is_active ?? true,
      })
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { error: "A product with this name already exists." };
      }
      throw new Error(error.message);
    }

    await logActivity({
      actorId: ctx.userId,
      action: "PRODUCT_CREATED",
      module: "products",
      entityType: "product",
      entityId: data.id,
      metadata: { via: "grid", name },
    });

    revalidateProductCaches();
    return { success: "Row added.", productId: data.id, product: data };
  } catch (error) {
    return toActionError(error);
  }
}
