"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import {
  createFollowupRecord,
  getFollowupById,
} from "@/lib/db/followups";
import { createClient } from "@/lib/supabase/server";
import { followupFormSchema } from "@/validations/followup";

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
