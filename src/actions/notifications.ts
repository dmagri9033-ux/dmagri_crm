"use server";

import { revalidatePath } from "next/cache";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/db/notifications";
import { toActionError } from "@/lib/rbac/errors";

export type NotificationActionState = {
  error?: string;
  success?: string;
};

export async function markNotificationReadAction(
  _prev: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  try {
    const notificationId = String(formData.get("notificationId") || "");
    if (!notificationId) return { error: "Missing notification" };
    await markNotificationRead(notificationId);
    revalidatePath("/", "layout");
    return { success: "Marked read." };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markAllNotificationsReadAction(
  _prev: NotificationActionState,
  formData: FormData,
): Promise<NotificationActionState> {
  void formData;
  try {
    await markAllNotificationsRead();
    revalidatePath("/", "layout");
    return { success: "All notifications marked read." };
  } catch (error) {
    return toActionError(error);
  }
}
