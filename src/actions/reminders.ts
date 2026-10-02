"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity/log";
import { normalizeMobile } from "@/lib/customers/normalize-mobile";
import { parseIstDateTimeLocal, toDatetimeLocalIst } from "@/lib/datetime/ist";
import { findCustomerByNormalizedMobile } from "@/lib/db/customers";
import { authorize } from "@/lib/rbac/authorize";
import { toActionError } from "@/lib/rbac/errors";
import {
  createReminderRecord,
  getReminderById,
  listReminders,
  type ReminderWithRelations,
} from "@/lib/db/reminders";
import { createClient } from "@/lib/supabase/server";
import {
  reminderFilterSchema,
  reminderFormSchema,
  snoozeReminderSchema,
  type ReminderFilterInput,
} from "@/validations/reminder";

export type ReminderActionState = {
  error?: string;
  success?: string;
  reminderId?: string;
};

export type ReminderGridLoadResult = {
  error?: string;
  reminders?: ReminderWithRelations[];
  total?: number;
};

export type ReminderPatchResult = {
  error?: string;
  success?: string;
  reminderId?: string;
  customerCreated?: boolean;
  reminder?: ReminderWithRelations;
};

function defaultRemindAtLocal(): string {
  return toDatetimeLocalIst(new Date(Date.now() + 3_600_000));
}

async function resolveCustomerForReminder(input: {
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
    metadata: { via: "reminder_grid", mobile: mobileNormalized },
  });

  return { customerId: data.id, created: true };
}

function parseRemindAt(value: string): Date {
  const trimmed = value.trim();
  if (!trimmed) return new Date(Number.NaN);
  if (trimmed.includes("T") && !trimmed.endsWith("Z") && !trimmed.includes("+")) {
    return parseIstDateTimeLocal(trimmed);
  }
  return parseIstDateTimeLocal(trimmed);
}

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

export async function loadRemindersGridAction(
  rawFilters: Partial<ReminderFilterInput> = {},
): Promise<ReminderGridLoadResult> {
  try {
    await authorize("reminder.view");
    const filters = reminderFilterSchema.parse(rawFilters);
    const result = await listReminders(filters);
    return {
      reminders: result.reminders,
      total: result.total,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function patchReminderFieldAction(input: {
  reminderId: string;
  field:
    | "title"
    | "notes"
    | "remind_at"
    | "mobile"
    | "customer_id"
    | "assigned_user_id";
  value: string;
}): Promise<ReminderPatchResult> {
  try {
    const ctx = await authorize("reminder.update");
    const existing = await getReminderById(input.reminderId);
    if (!existing) return { error: "Reminder not found" };

    const supabase = await createClient();
    let customerId = existing.customer_id;
    let customerCreated = false;

    const patch: {
      title?: string;
      notes?: string | null;
      remind_at?: string;
      customer_id?: string;
      assigned_user_id?: string;
      snoozed_until?: null;
      inquiry_id?: null;
    } = {};

    if (input.field === "title") {
      const title = input.value.trim();
      if (!title) return { error: "Title is required" };
      if (title.length > 200) return { error: "Title is too long" };
      patch.title = title;
    } else if (input.field === "notes") {
      patch.notes = input.value.trim() || null;
    } else if (input.field === "remind_at") {
      const remindAt = parseRemindAt(input.value);
      if (Number.isNaN(remindAt.getTime())) {
        return { error: "Invalid reminder date/time" };
      }
      patch.remind_at = remindAt.toISOString();
      patch.snoozed_until = null;
    } else if (input.field === "mobile") {
      const { customerId: nextId, created } = await resolveCustomerForReminder({
        userId: ctx.userId,
        mobile: input.value,
      });
      customerId = nextId;
      customerCreated = created;
      patch.customer_id = nextId;
      patch.inquiry_id = null;
    } else if (input.field === "customer_id") {
      const id = input.value.trim();
      if (!id) return { error: "Customer is required" };
      const { data: customer } = await supabase
        .from("customers")
        .select("id")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!customer) return { error: "Customer not found" };
      customerId = id;
      patch.customer_id = id;
      if (existing.inquiry_id) {
        const { data: inquiry } = await supabase
          .from("inquiries")
          .select("customer_id")
          .eq("id", existing.inquiry_id)
          .maybeSingle();
        if (inquiry && inquiry.customer_id !== id) {
          patch.inquiry_id = null;
        }
      }
    } else if (input.field === "assigned_user_id") {
      const assigneeId = input.value.trim();
      if (!assigneeId) return { error: "Select an assignee" };
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", assigneeId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .maybeSingle();
      if (!profile) return { error: "Assignee not found" };
      patch.assigned_user_id = assigneeId;
    } else {
      return { error: "Unknown field" };
    }

    const { error } = await supabase
      .from("reminders")
      .update(patch)
      .eq("id", input.reminderId)
      .is("deleted_at", null);

    if (error) throw new Error(error.message);

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_UPDATED",
      module: "reminders",
      entityType: "reminder",
      entityId: input.reminderId,
      customerId,
      metadata: { field: input.field, via: "grid" },
    });

    revalidateReminderPaths(customerId);
    if (existing.customer_id !== customerId) {
      revalidateReminderPaths(existing.customer_id);
    }

    const refreshed = await getReminderById(input.reminderId);
    return {
      success: "Saved",
      reminderId: input.reminderId,
      customerCreated,
      reminder: refreshed ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}

export async function createReminderGridRowAction(input: {
  mobile: string;
  title: string;
  remind_at_local?: string;
  notes?: string;
  assigned_user_id?: string;
}): Promise<ReminderPatchResult> {
  try {
    const ctx = await authorize("reminder.create");
    const mobile = input.mobile.trim();
    const title = input.title.trim();
    if (!mobile || !normalizeMobile(mobile)) {
      return { error: "Enter a valid mobile number" };
    }
    if (!title) return { error: "Title is required" };

    const { customerId, created } = await resolveCustomerForReminder({
      userId: ctx.userId,
      mobile,
    });

    const remindLocal = input.remind_at_local?.trim() || defaultRemindAtLocal();
    const remindAt = parseRemindAt(remindLocal);
    if (Number.isNaN(remindAt.getTime())) {
      return { error: "Invalid reminder date/time" };
    }

    const assigneeId = input.assigned_user_id?.trim() || ctx.userId;

    const reminderId = await createReminderRecord({
      userId: ctx.userId,
      title,
      customer_id: customerId,
      remind_at: remindAt.toISOString(),
      notes: input.notes?.trim() || null,
      assigned_user_id: assigneeId,
    });

    await logActivity({
      actorId: ctx.userId,
      action: "REMINDER_CREATED",
      module: "reminders",
      entityType: "reminder",
      entityId: reminderId,
      customerId,
      metadata: { via: "grid", customerCreated: created },
    });

    revalidateReminderPaths(customerId);
    const refreshed = await getReminderById(reminderId);
    return {
      success: created
        ? "Row added. New customer created."
        : "Row added.",
      reminderId,
      customerCreated: created,
      reminder: refreshed ?? undefined,
    };
  } catch (error) {
    return toActionError(error);
  }
}
