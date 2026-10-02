"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { parseIstDateTimeLocal } from "@/lib/datetime/ist";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import {
  createReminderRecord,
  getReminderById,
} from "@/lib/db/reminders";
import { createClient } from "@/lib/supabase/server";
import {
  reminderFormSchema,
  snoozeReminderSchema,
} from "@/validations/reminder";

export type ReminderActionState = {
  error?: string;
  success?: string;
  reminderId?: string;
};

function revalidateReminderPaths(customerId?: string) {
  revalidatePath("/reminders");
  if (customerId) {
    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
  }
}

function parseReminderForm(formData: FormData) {
  const inquiryRaw = String(formData.get("inquiry_id") || "").trim();
  return reminderFormSchema.safeParse({
    title: formData.get("title"),
    customer_id: formData.get("customer_id"),
    inquiry_id: inquiryRaw === "" ? null : inquiryRaw,
    remind_at_local: formData.get("remind_at_local"),
    notes: formData.get("notes") || "",
    assigned_user_id: formData.get("assigned_user_id"),
  });
}

export async function createReminderAction(
  _prev: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  try {
    const ctx = await authorize("reminder.create");
    const parsed = parseReminderForm(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid reminder" };
    }

    const remindAt = parseIstDateTimeLocal(parsed.data.remind_at_local);
    if (Number.isNaN(remindAt.getTime())) {
      return { error: "Invalid reminder date/time" };
    }

    const reminderId = await createReminderRecord({
      userId: ctx.userId,
      title: parsed.data.title,
      customer_id: parsed.data.customer_id,
      inquiry_id: parsed.data.inquiry_id,
      remind_at: remindAt.toISOString(),
      notes: parsed.data.notes || null,
      assigned_user_id: parsed.data.assigned_user_id,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_CREATED",
      module: "reminders",
      entityType: "reminder",
      entityId: reminderId,
      customerId: parsed.data.customer_id,
    });

    revalidateReminderPaths(parsed.data.customer_id);
    return { success: "Reminder created.", reminderId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateReminderAction(
  _prev: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  try {
    const ctx = await authorize("reminder.update");
    const reminderId = String(formData.get("reminderId") || "");
    if (!reminderId) return { error: "Missing reminder id" };

    const parsed = parseReminderForm(formData);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid reminder" };
    }

    const existing = await getReminderById(reminderId);
    if (!existing) return { error: "Reminder not found" };

    const remindAt = parseIstDateTimeLocal(parsed.data.remind_at_local);
    if (Number.isNaN(remindAt.getTime())) {
      return { error: "Invalid reminder date/time" };
    }

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
      .from("reminders")
      .update({
        title: parsed.data.title.trim(),
        customer_id: parsed.data.customer_id,
        inquiry_id: inquiryId,
        remind_at: remindAt.toISOString(),
        notes: parsed.data.notes?.trim() || null,
        assigned_user_id: parsed.data.assigned_user_id,
        snoozed_until: null,
      })
      .eq("id", reminderId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_UPDATED",
      module: "reminders",
      entityType: "reminder",
      entityId: reminderId,
      customerId: parsed.data.customer_id,
    });

    revalidateReminderPaths(parsed.data.customer_id);
    if (existing.customer_id !== parsed.data.customer_id) {
      revalidateReminderPaths(existing.customer_id);
    }

    return { success: "Reminder updated.", reminderId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteReminderAction(
  _prev: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  try {
    const ctx = await authorize("reminder.delete");
    const reminderId = String(formData.get("reminderId") || "");
    if (!reminderId) return { error: "Missing reminder id" };

    const existing = await getReminderById(reminderId);
    if (!existing) return { error: "Reminder not found" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("reminders")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", reminderId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_DELETED",
      module: "reminders",
      entityType: "reminder",
      entityId: reminderId,
      customerId: existing.customer_id,
    });

    revalidateReminderPaths(existing.customer_id);
    return { success: "Reminder deleted." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function completeReminderAction(
  _prev: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  try {
    const ctx = await authorize("reminder.complete");
    const reminderId = String(formData.get("reminderId") || "");
    if (!reminderId) return { error: "Missing reminder id" };

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
      customerId: existing.customer_id,
    });

    revalidateReminderPaths(existing.customer_id);
    return { success: "Reminder completed.", reminderId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reopenReminderAction(
  _prev: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  try {
    const ctx = await authorize("reminder.update");
    const reminderId = String(formData.get("reminderId") || "");
    if (!reminderId) return { error: "Missing reminder id" };

    const existing = await getReminderById(reminderId);
    if (!existing) return { error: "Reminder not found" };

    const supabase = await createClient();
    const { error } = await supabase
      .from("reminders")
      .update({
        completed_at: null,
        cancelled_at: null,
      })
      .eq("id", reminderId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_REOPENED",
      module: "reminders",
      entityType: "reminder",
      entityId: reminderId,
      customerId: existing.customer_id,
    });

    revalidateReminderPaths(existing.customer_id);
    return { success: "Reminder reopened.", reminderId };
  } catch (error) {
    return toActionError(error);
  }
}

export async function snoozeReminderAction(
  _prev: ReminderActionState,
  formData: FormData,
): Promise<ReminderActionState> {
  try {
    const ctx = await authorize("reminder.update");
    const parsed = snoozeReminderSchema.safeParse({
      reminderId: formData.get("reminderId"),
      until_local: formData.get("until_local"),
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Invalid snooze" };
    }

    const existing = await getReminderById(parsed.data.reminderId);
    if (!existing) return { error: "Reminder not found" };
    if (existing.completed_at) return { error: "Cannot snooze a completed reminder" };
    if (existing.cancelled_at) return { error: "Cannot snooze a cancelled reminder" };

    const until = parseIstDateTimeLocal(parsed.data.until_local);
    if (Number.isNaN(until.getTime())) {
      return { error: "Invalid snooze date/time" };
    }
    if (until.getTime() <= Date.now()) {
      return { error: "Snooze time must be in the future" };
    }

    const untilIso = until.toISOString();
    const supabase = await createClient();
    const { error } = await supabase
      .from("reminders")
      .update({
        snoozed_until: untilIso,
        remind_at: untilIso,
        completed_at: null,
        cancelled_at: null,
      })
      .eq("id", parsed.data.reminderId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_SNOOZED",
      module: "reminders",
      entityType: "reminder",
      entityId: parsed.data.reminderId,
      customerId: existing.customer_id,
      metadata: { snoozed_until: untilIso },
    });

    revalidateReminderPaths(existing.customer_id);
    return { success: "Reminder snoozed.", reminderId: parsed.data.reminderId };
  } catch (error) {
    return toActionError(error);
  }
}
