"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { findCustomerByNormalizedMobile } from "@/lib/db/customers";
import {
  createFollowupRecord,
  getFollowupById,
  listFollowups,
  type FollowupWithRelations,
} from "@/lib/db/followups";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { createClient } from "@/lib/supabase/server";
import {
  followupFilterSchema,
  followupFormSchema,
  type FollowupFilterInput,
} from "@/validations/followup";

export type FollowupActionState = {
  error?: string;
  success?: string;
  followupId?: string;
};

function revalidateFollowupPaths(customerId?: string, inquiryId?: string | null) {
  revalidatePath("/follow-ups");
  if (customerId) {
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
  }
  if (inquiryId) {
    revalidatePath("/inquiries");
  }
}

function parseFollowupForm(formData: FormData) {
  const inquiryRaw = String(formData.get("inquiry_id") || "").trim();
  return followupFormSchema.safeParse({
    followup_date: formData.get("followup_date"),
    customer_id: formData.get("customer_id"),
    inquiry_id: inquiryRaw === "" ? null : inquiryRaw,
    notes: formData.get("notes"),
  });
}

export async function createFollowupAction(
  _prev: FollowupActionState,
  formData: FormData,
): Promise<FollowupActionState> {
  try {
    const ctx = await authorize("followup.create");
    const parsed = parseFollowupForm(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid follow-up" };
    }

    const inquiryId = parsed.data.inquiry_id || null;
    const followupId = await createFollowupRecord({
      userId: ctx.userId,
      followup_date: parsed.data.followup_date,
      customer_id: parsed.data.customer_id,
      inquiry_id: inquiryId,
      notes: parsed.data.notes,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "FOLLOWUP_CREATED",
      module: "followups",
      entityType: "followup",
      entityId: followupId,
      customerId: parsed.data.customer_id,
      metadata: inquiryId ? { inquiryId } : {},
    });

    revalidateFollowupPaths(parsed.data.customer_id, inquiryId);
    return { success: "Follow-up added.", followupId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateFollowupAction(
  _prev: FollowupActionState,
  formData: FormData,
): Promise<FollowupActionState> {
  try {
    const ctx = await authorize("followup.update");
    const followupId = String(formData.get("followupId") || "");
    if (!followupId) return { error: "Missing follow-up id" };

    const parsed = parseFollowupForm(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid follow-up" };
    }

    const existing = await getFollowupById(followupId);
    if (!existing) return { error: "Follow-up not found" };

    const inquiryId = parsed.data.inquiry_id || null;
    if (inquiryId) {
      const supabaseCheck = await createClient();
      const { data: inquiry } = await supabaseCheck
        .from("inquiries")
        .select("id, customer_id")
        .eq("id", inquiryId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!inquiry) return { error: "Inquiry not found" };
      if (inquiry.customer_id !== parsed.data.customer_id) {
        return { error: "Inquiry does not belong to this customer" };
      }
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("followups")
      .update({
        followup_date: parsed.data.followup_date,
        customer_id: parsed.data.customer_id,
        inquiry_id: inquiryId,
        notes: parsed.data.notes.trim(),
      })
      .eq("id", followupId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "FOLLOWUP_UPDATED",
      module: "followups",
      entityType: "followup",
      entityId: followupId,
      customerId: parsed.data.customer_id,
    });

    revalidateFollowupPaths(parsed.data.customer_id, inquiryId);
    if (existing.customer_id !== parsed.data.customer_id) {
      revalidateFollowupPaths(existing.customer_id, existing.inquiry_id);
    }

    return { success: "Follow-up updated.", followupId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteFollowupAction(
  _prev: FollowupActionState,
  formData: FormData,
): Promise<FollowupActionState> {
  try {
    const ctx = await authorize("followup.delete");
    const followupId = String(formData.get("followupId") || "");
    if (!followupId) return { error: "Missing follow-up id" };

    const existing = await getFollowupById(followupId);
    if (!existing) return { error: "Follow-up not found" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("followups")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", followupId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "FOLLOWUP_DELETED",
      module: "followups",
      entityType: "followup",
      entityId: followupId,
      customerId: existing.customer_id,
    });

    revalidateFollowupPaths(existing.customer_id, existing.inquiry_id);
    return { success: "Follow-up deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

function todayIst(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
}

async function resolveCustomerForFollowup(input: {
  userId: string;
  mobile: string;
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
  const name = `Customer ${input.mobile.replace(/\D/g, "").slice(-10)}`;

  const { data, error } = await supabase
    .from("customers")
    .insert({
      name,
      mobile: input.mobile.trim(),
      mobile_normalized: mobileNormalized,
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
    metadata: { via: "followup_grid", mobile: mobileNormalized },
  });

  return { customerId: data.id, created: true };
}

export type FollowupPatchResult = {
  error?: string;
  success?: string;
  followupId?: string;
  customerCreated?: boolean;
  followup?: FollowupWithRelations;
};

export type FollowupGridLoadResult = {
  error?: string;
  followups?: FollowupWithRelations[];
  total?: number;
};

export async function loadFollowupsGridAction(
  rawFilters: Partial<FollowupFilterInput> = {},
): Promise<FollowupGridLoadResult> {
  try {
    await authorize("followup.view");
    const filters = followupFilterSchema.parse(rawFilters);
    const result = await listFollowups(filters);
    return {
      followups: result.followups,
      total: result.total,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchFollowupFieldAction(input: {
  followupId: string;
  field: "followup_date" | "notes" | "mobile" | "customer_id" | "inquiry_id";
  value: string;
}): Promise<FollowupPatchResult> {
  try {
    const ctx = await authorize("followup.update");
    const existing = await getFollowupById(input.followupId);
    if (!existing) return { error: "Follow-up not found" };

    const supabase = await createClient();
    let customerId = existing.customer_id;
    let customerCreated = false;
    let inquiryId = existing.inquiry_id;

    const patch: {
      followup_date?: string;
      notes?: string;
      customer_id?: string;
      inquiry_id?: string | null;
    } = {};

    if (input.field === "followup_date") {
      const date = input.value.trim();
      if (!date) return { error: "Date is required" };
      patch.followup_date = date;
    } else if (input.field === "notes") {
      const notes = input.value.trim();
      if (!notes) return { error: "Notes are required" };
      patch.notes = notes;
    } else if (input.field === "mobile") {
      const { customerId: nextId, created } = await resolveCustomerForFollowup({
        userId: ctx.userId,
        mobile: input.value,
      });
      customerId = nextId;
      customerCreated = created;
      patch.customer_id = nextId;
      if (
        existing.inquiry_id &&
        existing.inquiries &&
        existing.inquiries.customer_id !== nextId
      ) {
        patch.inquiry_id = null;
        inquiryId = null;
      }
    } else if (input.field === "customer_id") {
      const nextId = input.value.trim();
      if (!nextId) return { error: "Customer is required" };
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("id", nextId)
        .is("deleted_at", null)
        .maybeSingle();
      if (!customer) return { error: "Customer not found" };
      customerId = nextId;
      patch.customer_id = nextId;
      if (
        existing.inquiry_id &&
        existing.inquiries &&
        existing.inquiries.customer_id !== nextId
      ) {
        patch.inquiry_id = null;
        inquiryId = null;
      }
    } else if (input.field === "inquiry_id") {
      const raw = input.value.trim();
      inquiryId = raw === "" ? null : raw;
      if (inquiryId) {
        const { data: inquiry } = await supabase
          .from("inquiries")
          .select("id, customer_id")
          .eq("id", inquiryId)
          .is("deleted_at", null)
          .maybeSingle();
        if (!inquiry) return { error: "Inquiry not found" };
        if (inquiry.customer_id !== customerId) {
          return { error: "Inquiry does not belong to this customer" };
        }
      }
      patch.inquiry_id = inquiryId;
    } else {
      return { error: "Unknown field" };
    }

    const { error } = await supabase
      .from("followups")
      .update(patch)
      .eq("id", input.followupId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "FOLLOWUP_UPDATED",
      module: "followups",
      entityType: "followup",
      entityId: input.followupId,
      customerId,
      metadata: { field: input.field, via: "grid" },
    });

    revalidateFollowupPaths(customerId, inquiryId);
    if (existing.customer_id !== customerId) {
      revalidateFollowupPaths(existing.customer_id, existing.inquiry_id);
    }

    const refreshed = await getFollowupById(input.followupId);
    return {
      success: "Saved",
      followupId: input.followupId,
      customerCreated,
      followup: refreshed ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createFollowupGridRowAction(input: {
  mobile?: string;
  customer_id?: string;
  followup_date?: string;
  inquiry_id?: string | null;
  notes: string;
}): Promise<FollowupPatchResult> {
  try {
    const ctx = await authorize("followup.create");
    const notes = input.notes.trim();
    if (!notes) return { error: "Notes are required" };

    let customerId = input.customer_id?.trim() || "";
    let customerCreated = false;

    if (!customerId) {
      const mobile = input.mobile?.trim() || "";
      if (!mobile || !normalizeMobile(mobile)) {
        return { error: "Enter a valid mobile number" };
      }
      const resolved = await resolveCustomerForFollowup({
        userId: ctx.userId,
        mobile,
      });
      customerId = resolved.customerId;
      customerCreated = resolved.created;
    }

    const followupDate = input.followup_date?.trim() || todayIst();
    const inquiryRaw = input.inquiry_id?.trim() || null;

    const followupId = await createFollowupRecord({
      userId: ctx.userId,
      followup_date: followupDate,
      customer_id: customerId,
      inquiry_id: inquiryRaw,
      notes,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "FOLLOWUP_CREATED",
      module: "followups",
      entityType: "followup",
      entityId: followupId,
      customerId,
      metadata: { via: "grid", customerCreated, inquiryId: inquiryRaw },
    });

    revalidateFollowupPaths(customerId, inquiryRaw);
    const refreshed = await getFollowupById(followupId);
    return {
      success: customerCreated
        ? "Row added. New customer created."
        : "Row added.",
      followupId,
      customerCreated,
      followup: refreshed ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}
