"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import {
  createInquiryRecord,
  getInquiryById,
  syncInquiryPurchase,
} from "@/lib/db/inquiries";
import { createClient } from "@/lib/supabase/server";
import { inquiryFormSchema } from "@/validations/inquiry";

export type InquiryActionState = {
  error?: string;
  success?: string;
  inquiryId?: string;
};

function revalidateInquiryPaths(customerId?: string) {
  revalidatePath("/inquiries");
  if (customerId) {
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
  }
}

function parseInquiryForm(formData: FormData) {
  const typeRaw = String(formData.get("customer_type") || "").trim();
  return inquiryFormSchema.safeParse({
    inquiry_date: formData.get("inquiry_date"),
    customer_id: formData.get("customer_id"),
    product_id: formData.get("product_id"),
    customer_type: typeRaw === "" ? null : typeRaw,
    product_purchased:
      formData.get("product_purchased") === "on" ||
      formData.get("product_purchased") === "true",
    remarks: formData.get("remarks") || "",
  });
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

    const inquiryId = await createInquiryRecord({
      userId: ctx.userId,
      ...parsed.data,
      remarks: parsed.data.remarks || null,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_CREATED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId: parsed.data.customer_id,
      metadata: { productId: parsed.data.product_id },
    });

    if (parsed.data.product_purchased) {
      await logActivity({
        actorId: ctx.userId,
        action: "PRODUCT_PURCHASED",
        module: "inquiries",
        entityType: "inquiry",
        entityId: inquiryId,
        customerId: parsed.data.customer_id,
        metadata: { productId: parsed.data.product_id },
      });
    }

    revalidateInquiryPaths(parsed.data.customer_id);
    return { success: "Inquiry created.", inquiryId };
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

    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("name")
      .eq("id", parsed.data.product_id)
      .maybeSingle();

    const { data: customer } = await supabase
      .from("customers")
      .select("name, mobile, customer_type")
      .eq("id", parsed.data.customer_id)
      .maybeSingle();

    if (!customer) return { error: "Customer not found" };

    const { error } = await supabase
      .from("inquiries")
      .update({
        inquiry_date: parsed.data.inquiry_date,
        customer_id: parsed.data.customer_id,
        product_id: parsed.data.product_id,
        customer_type: parsed.data.customer_type || customer.customer_type || null,
        product_purchased: parsed.data.product_purchased,
        remarks: parsed.data.remarks?.trim() || null,
        customer_name_snapshot: customer.name,
        mobile_snapshot: customer.mobile,
        product_name_snapshot: product?.name ?? null,
      })
      .eq("id", inquiryId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await syncInquiryPurchase({
      inquiryId,
      customerId: parsed.data.customer_id,
      productId: parsed.data.product_id,
      purchased: parsed.data.product_purchased,
      purchasedAt: parsed.data.inquiry_date,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_UPDATED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId: parsed.data.customer_id,
    });

    if (parsed.data.product_purchased && !existing.product_purchased) {
      await logActivity({
        actorId: ctx.userId,
        action: "PRODUCT_PURCHASED",
        module: "inquiries",
        entityType: "inquiry",
        entityId: inquiryId,
        customerId: parsed.data.customer_id,
        metadata: { productId: parsed.data.product_id },
      });
    }

    revalidateInquiryPaths(parsed.data.customer_id);
    if (existing.customer_id !== parsed.data.customer_id) {
      revalidateInquiryPaths(existing.customer_id);
    }

    return { success: "Inquiry updated.", inquiryId };
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
