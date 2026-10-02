"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { findCustomerByNormalizedMobile } from "@/lib/db/customers";
import {
  createInquiryRecord,
  getInquiryById,
  listInquiries,
  syncInquiryPurchase,
  type InquiryWithRelations,
} from "@/lib/db/inquiries";
import { listProducts } from "@/lib/db/products";
import type { Product } from "@/lib/db/products";
import { createClient } from "@/lib/supabase/server";
import { inquiryFilterSchema, inquiryFormSchema } from "@/validations/inquiry";
import type { InquiryFilterInput } from "@/validations/inquiry";
export type InquiryActionState = {
  error?: string;
  success?: string;
  inquiryId?: string;
  customerCreated?: boolean;
};

function revalidateInquiryPaths(customerId?: string | null) {
  revalidatePath("/inquiries");
  revalidatePath("/customers");
  if (customerId) {
    revalidatePath(`/customers/${customerId}`);
  }
}

function parseInquiryForm(formData: FormData) {
  const typeRaw = String(formData.get("customer_type") || "").trim();
  return inquiryFormSchema.safeParse({
    mobile: formData.get("mobile"),
    customer_name: formData.get("customer_name") || "",
    inquiry_date: formData.get("inquiry_date") || "",
    product_id: formData.get("product_id") || "",
    customer_type: typeRaw === "" ? null : typeRaw,
    product_purchased:
      formData.get("product_purchased") === "on" ||
      formData.get("product_purchased") === "true",
    remarks: formData.get("remarks") || "",
  });
}

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

/**
 * Find customer by mobile, or create one automatically for inquiry capture.
 */
async function resolveCustomerForInquiry(input: {
  userId: string;
  mobile: string;
  customerName?: string;
  customerType?: string | null;
}): Promise<{ customerId: string; created: boolean }> {
  const mobileNormalized = normalizeMobile(input.mobile);
  if (!mobileNormalized) {
    throw new Error("Enter a valid mobile number");
  }

  const existing = await findCustomerByNormalizedMobile(mobileNormalized);
  if (existing) {
    return { customerId: existing.id, created: false };
  }

  const supabase = await createClient();
  const name =
    input.customerName?.trim() ||
    `Customer ${input.mobile.replace(/\D/g, "").slice(-10)}`;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name,
      mobile: input.mobile.trim(),
      mobile_normalized: mobileNormalized,
      customer_type: input.customerType ?? null,
      created_by: input.userId,
      assigned_user_id: input.userId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      const raced = await findCustomerByNormalizedMobile(mobileNormalized);
      if (raced) return { customerId: raced.id, created: false };
    }
    throw new Error(error.message);
  }

  await logActivity({
    actorId: input.userId,
    action: "CUSTOMER_CREATED",
    module: "customers",
    entityType: "customer",
    entityId: data.id,
    customerId: data.id,
    metadata: { via: "inquiry_form", mobile: mobileNormalized },
  });

  return { customerId: data.id, created: true };
}

export async function createInquiryAction(
  _prev: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  try {
    const ctx = await authorize("inquiry.create");
    const parsed = parseInquiryForm(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid inquiry" };
    }

    const { customerId, created } = await resolveCustomerForInquiry({
      userId: ctx.userId,
      mobile: parsed.data.mobile,
      customerName: parsed.data.customer_name,
      customerType: parsed.data.customer_type,
    });

    const inquiryDate = parsed.data.inquiry_date?.trim() || todayIst();
    const productId = parsed.data.product_id;
    const purchased = Boolean(parsed.data.product_purchased && productId);

    const inquiryId = await createInquiryRecord({
      userId: ctx.userId,
      inquiry_date: inquiryDate,
      customer_id: customerId,
      product_id: productId,
      customer_type: parsed.data.customer_type,
      product_purchased: purchased,
      remarks: parsed.data.remarks || null,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_CREATED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId,
      metadata: { productId, customerCreated: created },
    });

    if (purchased && productId) {
      await logActivity({
        actorId: ctx.userId,
        action: "PRODUCT_PURCHASED",
        module: "inquiries",
        entityType: "inquiry",
        entityId: inquiryId,
        customerId,
        metadata: { productId },
      });
    }

    revalidateInquiryPaths(customerId);
    return {
      success: created
        ? "Inquiry created. New customer added from this number."
        : "Inquiry created.",
      inquiryId,
      customerCreated: created,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateInquiryAction(
  _prev: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  try {
    const ctx = await authorize("inquiry.update");
    const inquiryId = String(formData.get("inquiryId") || "");
    if (!inquiryId) return { error: "Missing inquiry id" };

    const parsed = parseInquiryForm(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid inquiry" };
    }

    const existing = await getInquiryById(inquiryId);
    if (!existing) return { error: "Inquiry not found" };

    const { customerId, created } = await resolveCustomerForInquiry({
      userId: ctx.userId,
      mobile: parsed.data.mobile,
      customerName: parsed.data.customer_name,
      customerType: parsed.data.customer_type,
    });

    const inquiryDate = parsed.data.inquiry_date?.trim() || existing.inquiry_date;
    const productId = parsed.data.product_id;
    const purchased = Boolean(parsed.data.product_purchased && productId);

    const supabase = await createClient();
    const { data: product } = productId
      ? await supabase
          .from("products")
          .select("name")
          .eq("id", productId)
          .maybeSingle()
      : { data: null };

    const { data: customer } = await supabase
      .from("customers")
      .select("name, mobile, customer_type")
      .eq("id", customerId)
      .maybeSingle();

    if (!customer) return { error: "Customer not found" };

    const { error } = await supabase
      .from("inquiries")
      .update({
        inquiry_date: inquiryDate,
        customer_id: customerId,
        product_id: productId,
        customer_type: parsed.data.customer_type || customer.customer_type || null,
        product_purchased: purchased,
        remarks: parsed.data.remarks?.trim() || null,
        customer_name_snapshot: customer.name,
        mobile_snapshot: customer.mobile,
        product_name_snapshot: product?.name ?? null,
      })
      .eq("id", inquiryId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    if (productId) {
      await syncInquiryPurchase({
        inquiryId,
        customerId,
        productId,
        purchased,
        purchasedAt: inquiryDate,
      });
    } else if (existing.product_id && existing.product_purchased) {
      await syncInquiryPurchase({
        inquiryId,
        customerId: existing.customer_id,
        productId: existing.product_id,
        purchased: false,
        purchasedAt: inquiryDate,
      });
    }

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_UPDATED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId,
      metadata: { customerCreated: created },
    });

    if (purchased && productId && !existing.product_purchased) {
      await logActivity({
        actorId: ctx.userId,
        action: "PRODUCT_PURCHASED",
        module: "inquiries",
        entityType: "inquiry",
        entityId: inquiryId,
        customerId,
        metadata: { productId },
      });
    }

    revalidateInquiryPaths(customerId);
    if (existing.customer_id !== customerId) {
      revalidateInquiryPaths(existing.customer_id);
    }

    return {
      success: created
        ? "Inquiry updated. New customer added from this number."
        : "Inquiry updated.",
      inquiryId,
      customerCreated: created,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteInquiryAction(
  _prev: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  try {
    const ctx = await authorize("inquiry.delete");
    const inquiryId = String(formData.get("inquiryId") || "");
    if (!inquiryId) return { error: "Missing inquiry id" };

    const existing = await getInquiryById(inquiryId);
    if (!existing) return { error: "Inquiry not found" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("inquiries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", inquiryId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_DELETED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId: existing.customer_id,
    });

    revalidateInquiryPaths(existing.customer_id);
    return { success: "Inquiry deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeInquiryAction(
  _prev: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  try {
    const ctx = await authorize("inquiry.update");
    const inquiryId = String(formData.get("inquiryId") || "");
    if (!inquiryId) return { error: "Missing inquiry id" };

    const existing = await getInquiryById(inquiryId);
    if (!existing) return { error: "Inquiry not found" };
    if (existing.completed_at) {
      return { success: "Inquiry already completed.", inquiryId };
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("inquiries")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", inquiryId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_COMPLETED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId: existing.customer_id,
    });

    revalidateInquiryPaths(existing.customer_id);
    return { success: "Inquiry completed.", inquiryId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reopenInquiryAction(
  _prev: InquiryActionState,
  formData: FormData,
): Promise<InquiryActionState> {
  try {
    const ctx = await authorize("inquiry.update");
    const inquiryId = String(formData.get("inquiryId") || "");
    if (!inquiryId) return { error: "Missing inquiry id" };

    const existing = await getInquiryById(inquiryId);
    if (!existing) return { error: "Inquiry not found" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("inquiries")
      .update({ completed_at: null })
      .eq("id", inquiryId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_REOPENED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId: existing.customer_id,
    });

    revalidateInquiryPaths(existing.customer_id);
    return { success: "Inquiry reopened.", inquiryId };
  } catch (error) {
    return toActionError(error);
  }
}

export type InquiryPatchResult = {
  error?: string;
  success?: string;
  inquiryId?: string;
  customerCreated?: boolean;
  inquiry?: InquiryWithRelations;
};

export type InquiryGridLoadResult = {
  error?: string;
  inquiries?: InquiryWithRelations[];
  products?: Product[];
  total?: number;
};

/** Single-field auto-save for the Excel-style inquiries grid. */
export async function patchInquiryFieldAction(input: {
  inquiryId: string;
  field:
    | "inquiry_date"
    | "mobile"
    | "customer_type"
    | "product_id"
    | "product_purchased"
    | "remarks";
  value: string;
}): Promise<InquiryPatchResult> {
  try {
    const ctx = await authorize("inquiry.update");
    const existing = await getInquiryById(input.inquiryId);
    if (!existing) return { error: "Inquiry not found" };

    const supabase = await createClient();
    let customerId = existing.customer_id;
    let customerCreated = false;

    const patch: {
      inquiry_date?: string;
      customer_id?: string;
      customer_type?: string | null;
      product_id?: string | null;
      product_purchased?: boolean;
      remarks?: string | null;
      customer_name_snapshot?: string;
      mobile_snapshot?: string;
      product_name_snapshot?: string | null;
    } = {};

    if (input.field === "inquiry_date") {
      const date = input.value.trim() || existing.inquiry_date;
      patch.inquiry_date = date;
    } else if (input.field === "mobile") {
      const { customerId: nextId, created } = await resolveCustomerForInquiry({
        userId: ctx.userId,
        mobile: input.value,
        customerType: existing.customer_type,
      });
      customerId = nextId;
      customerCreated = created;
      const { data: customer } = await supabase
        .from("customers")
        .select("name, mobile, customer_type")
        .eq("id", nextId)
        .maybeSingle();
      if (!customer) return { error: "Customer not found" };
      patch.customer_id = nextId;
      patch.customer_name_snapshot = customer.name;
      patch.mobile_snapshot = customer.mobile;
      if (!existing.customer_type && customer.customer_type) {
        patch.customer_type = customer.customer_type;
      }
    } else if (input.field === "customer_type") {
      patch.customer_type = input.value.trim() || null;
    } else if (input.field === "product_id") {
      const productId = input.value.trim() || null;
      patch.product_id = productId;
      if (!productId) {
        patch.product_name_snapshot = null;
        patch.product_purchased = false;
      } else {
        const { data: product } = await supabase
          .from("products")
          .select("name")
          .eq("id", productId)
          .maybeSingle();
        patch.product_name_snapshot = product?.name ?? null;
      }
    } else if (input.field === "product_purchased") {
      const purchased = input.value === "true" || input.value === "yes";
      if (purchased && !existing.product_id) {
        return { error: "Select a product before marking purchased." };
      }
      patch.product_purchased = purchased;
    } else if (input.field === "remarks") {
      patch.remarks = input.value.trim() || null;
    } else {
      return { error: "Unknown field" };
    }

    const { error } = await supabase
      .from("inquiries")
      .update(patch)
      .eq("id", input.inquiryId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    const nextPurchased =
      patch.product_purchased ?? existing.product_purchased;
    const nextProductId =
      patch.product_id !== undefined ? patch.product_id : existing.product_id;
    const nextDate = patch.inquiry_date ?? existing.inquiry_date;

    if (nextProductId) {
      await syncInquiryPurchase({
        inquiryId: input.inquiryId,
        customerId,
        productId: nextProductId,
        purchased: Boolean(nextPurchased),
        purchasedAt: nextDate,
      });
    } else if (existing.product_id && existing.product_purchased) {
      await syncInquiryPurchase({
        inquiryId: input.inquiryId,
        customerId: existing.customer_id,
        productId: existing.product_id,
        purchased: false,
        purchasedAt: nextDate,
      });
    }

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_UPDATED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: input.inquiryId,
      customerId,
      metadata: { field: input.field, via: "grid" },
    });

    revalidateInquiryPaths(customerId);
    if (existing.customer_id !== customerId) {
      revalidateInquiryPaths(existing.customer_id);
    }

    const refreshed = await getInquiryById(input.inquiryId);

    return {
      success: "Saved",
      inquiryId: input.inquiryId,
      customerCreated,
      inquiry: refreshed ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}

/** Fresh grid load (client-visible server action — shows in Network as a POST). */
export async function loadInquiriesGridAction(
  rawFilters: Partial<InquiryFilterInput> = {},
): Promise<InquiryGridLoadResult> {
  try {
    await authorize("inquiry.view");
    const filters = inquiryFilterSchema.parse(rawFilters);
    const [result, productsResult] = await Promise.all([
      listInquiries(filters),
      listProducts({ status: "all", pageSize: 100, page: 1 }),
    ]);
    return {
      inquiries: result.inquiries,
      products: productsResult.products,
      total: result.total,
    };
  } catch (error) {
    return toActionError(error);
  }
}

/** Create a new inquiry row from the grid (mobile required). */
export async function createInquiryGridRowAction(input: {
  mobile: string;
  inquiry_date?: string;
  customer_type?: string;
  product_id?: string;
  product_purchased?: boolean;
  remarks?: string;
}): Promise<InquiryPatchResult> {
  try {
    const ctx = await authorize("inquiry.create");
    const mobile = input.mobile.trim();
    if (!mobile || !normalizeMobile(mobile)) {
      return { error: "Enter a valid mobile number" };
    }

    const typeRaw = (input.customer_type || "").trim();
    const { customerId, created } = await resolveCustomerForInquiry({
      userId: ctx.userId,
      mobile,
      customerType: typeRaw || null,
    });

    const productId = input.product_id?.trim() || null;
    const purchased = Boolean(input.product_purchased && productId);
    const inquiryDate = input.inquiry_date?.trim() || todayIst();

    const inquiryId = await createInquiryRecord({
      userId: ctx.userId,
      inquiry_date: inquiryDate,
      customer_id: customerId,
      product_id: productId,
      customer_type: typeRaw || null,
      product_purchased: purchased,
      remarks: input.remarks?.trim() || null,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_CREATED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId,
      metadata: { via: "grid", customerCreated: created },
    });

    revalidateInquiryPaths(customerId);
    const refreshed = inquiryId ? await getInquiryById(inquiryId) : null;
    return {
      success: created
        ? "Row added. New customer created."
        : "Row added.",
      inquiryId,
      customerCreated: created,
      inquiry: refreshed ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}
