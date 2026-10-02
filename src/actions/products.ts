"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { getProductReferenceCounts } from "@/lib/db/products";
import { createClient } from "@/lib/supabase/server";
import { productFormSchema } from "@/validations/product";

export type ProductActionState = {
  error?: string;
  success?: string;
  productId?: string;
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

    revalidatePath("/products");
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

    revalidatePath("/products");
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

    revalidatePath("/products");
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

    revalidatePath("/products");
    return { success: "Product deleted." };
  } catch (error) {
    return toActionError(error);
  }
}
