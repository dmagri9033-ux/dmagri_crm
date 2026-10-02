"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity/log";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import { createInquiryRecord } from "@/lib/db/inquiries";
import { createFollowupRecord } from "@/lib/db/followups";
import { createReminderRecord, getReminderById } from "@/lib/db/reminders";
import { parseIstDateTimeLocal } from "@/lib/datetime/ist";
import { createClient } from "@/lib/supabase/server";

export type Customer360ActionState = {
  error?: string;
  success?: string;
};

function revalidateCustomer(customerId: string) {
  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
}

export async function addCustomerNoteAction(
  _prev: Customer360ActionState,
  formData: FormData,
): Promise<Customer360ActionState> {
  try {
    const ctx = await authorize("customer.update");
    const customerId = String(formData.get("customerId") || "");
    const body = String(formData.get("body") || "").trim();

    if (!customerId) return { error: "Missing customer" };
    if (body.length < 1) return { error: "Note cannot be empty" };
    if (body.length > 5000) return { error: "Note is too long" };

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("customer_notes")
      .insert({
        customer_id: customerId,
        body,
        created_by: ctx.userId,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "NOTE_CREATED",
      module: "customers",
      entityType: "customer_note",
      entityId: data.id,
      customerId,
    });

    revalidateCustomer(customerId);
    return { success: "Note added." };
  } catch (error) {
    return toActionError(error);
  }
}

const inquiryQuickSchema = z.object({
  customerId: z.string().uuid(),
  productId: z.string().uuid(),
  inquiryDate: z.string().min(1),
  customerType: z.string().optional().nullable(),
  productPurchased: z.boolean(),
  remarks: z.string().optional(),
});

export async function addInquiryQuickAction(
  _prev: Customer360ActionState,
  formData: FormData,
): Promise<Customer360ActionState> {
  try {
    const ctx = await authorize("inquiry.create");
    const parsed = inquiryQuickSchema.safeParse({
      customerId: formData.get("customerId"),
      productId: formData.get("productId"),
      inquiryDate: formData.get("inquiryDate"),
      customerType: formData.get("customerType") || null,
      productPurchased: formData.get("productPurchased") === "true",
      remarks: formData.get("remarks") || "",
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid inquiry" };
    }

    const inquiryId = await createInquiryRecord({
      userId: ctx.userId,
      inquiry_date: parsed.data.inquiryDate,
      customer_id: parsed.data.customerId,
      product_id: parsed.data.productId,
      customer_type: parsed.data.customerType,
      product_purchased: parsed.data.productPurchased,
      remarks: parsed.data.remarks || null,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "INQUIRY_CREATED",
      module: "inquiries",
      entityType: "inquiry",
      entityId: inquiryId,
      customerId: parsed.data.customerId,
      metadata: { productId: parsed.data.productId },
    });

    if (parsed.data.productPurchased) {
      await logActivity({
        actorId: ctx.userId,
        action: "PRODUCT_PURCHASED",
        module: "inquiries",
        entityType: "inquiry",
        entityId: inquiryId,
        customerId: parsed.data.customerId,
        metadata: { productId: parsed.data.productId },
      });
    }

    revalidatePath("/inquiries");
    revalidateCustomer(parsed.data.customerId);
    return { success: "Inquiry added." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addFollowupQuickAction(
  _prev: Customer360ActionState,
  formData: FormData,
): Promise<Customer360ActionState> {
  try {
    const ctx = await authorize("followup.create");
    const customerId = String(formData.get("customerId") || "");
    const followupDate = String(formData.get("followupDate") || "");
    const notes = String(formData.get("notes") || "").trim();
    const inquiryId = String(formData.get("inquiryId") || "").trim();

    if (!customerId || !followupDate) return { error: "Missing required fields" };
    if (!notes) return { error: "Follow-up notes are required" };

    const followupId = await createFollowupRecord({
      userId: ctx.userId,
      followup_date: followupDate,
      customer_id: customerId,
      inquiry_id: inquiryId || null,
      notes,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "FOLLOWUP_CREATED",
      module: "followups",
      entityType: "followup",
      entityId: followupId,
      customerId,
    });

    revalidateCustomer(customerId);
    revalidatePath("/follow-ups");
    return { success: "Follow-up added." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function addReminderQuickAction(
  _prev: Customer360ActionState,
  formData: FormData,
): Promise<Customer360ActionState> {
  try {
    const ctx = await authorize("reminder.create");
    const customerId = String(formData.get("customerId") || "");
    const title = String(formData.get("title") || "").trim();
    const remindAtLocal = String(formData.get("remindAt") || "");
    const notes = String(formData.get("notes") || "").trim();

    if (!customerId || !title || !remindAtLocal) {
      return { error: "Title and date/time are required" };
    }

    const remindAt = parseIstDateTimeLocal(remindAtLocal);
    if (Number.isNaN(remindAt.getTime())) {
      return { error: "Invalid reminder date/time" };
    }

    const reminderId = await createReminderRecord({
      userId: ctx.userId,
      title,
      customer_id: customerId,
      remind_at: remindAt.toISOString(),
      notes: notes || null,
      assigned_user_id: ctx.userId,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_CREATED",
      module: "reminders",
      entityType: "reminder",
      entityId: reminderId,
      customerId,
    });

    revalidateCustomer(customerId);
    revalidatePath("/reminders");
    return { success: "Reminder added." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeReminderQuickAction(
  _prev: Customer360ActionState,
  formData: FormData,
): Promise<Customer360ActionState> {
  try {
    const ctx = await authorize("reminder.complete");
    const reminderId = String(formData.get("reminderId") || "");
    const customerId = String(formData.get("customerId") || "");
    if (!reminderId || !customerId) return { error: "Missing reminder" };

    const existing = await getReminderById(reminderId);
    if (!existing) return { error: "Reminder not found" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("reminders")
      .update({
        completed_at: new Date().toISOString(),
        cancelled_at: null,
      })
      .eq("id", reminderId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_COMPLETED",
      module: "reminders",
      entityType: "reminder",
      entityId: reminderId,
      customerId,
    });

    revalidateCustomer(customerId);
    revalidatePath("/reminders");
    return { success: "Reminder completed." };
  } catch (error) {
    return toActionError(error);
  }
}
