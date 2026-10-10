import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/types/database.types";

export type ActivityAction =
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "CUSTOMER_DELETED"
  | "INQUIRY_CREATED"
  | "INQUIRY_UPDATED"
  | "INQUIRY_DELETED"
  | "FOLLOWUP_CREATED"
  | "FOLLOWUP_UPDATED"
  | "FOLLOWUP_DELETED"
  | "FOLLOWUP_COMPLETED"
  | "FOLLOWUP_REOPENED"
  | "INQUIRY_COMPLETED"
  | "INQUIRY_REOPENED"
  | "REMINDER_CREATED"
  | "REMINDER_UPDATED"
  | "REMINDER_DELETED"
  | "REMINDER_COMPLETED"
  | "REMINDER_REOPENED"
  | "REMINDER_SNOOZED"
  | "NOTE_CREATED"
  | "PRODUCT_PURCHASED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DELETED"
  | "ROLE_CREATED"
  | "ROLE_UPDATED"
  | "ROLE_DELETED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_DELETED"
  | "USER_PASSWORD_RESET"
  | "EXCEL_IMPORT_INQUIRIES"
  | "EXCEL_IMPORT_CUSTOMERS";

/**
 * Fire-and-forget activity log for Server Actions / handlers.
 * Uses `after()` so Vercel keeps the invocation alive until the insert finishes,
 * without blocking the user-facing response. Service role avoids cookie access
 * inside the deferred callback.
 */
export function logActivity(input: {
  actorId: string;
  action: ActivityAction | string;
  module: string;
  entityType: string;
  entityId: string;
  customerId?: string | null;
  metadata?: Json;
}): void {
  after(async () => {
    try {
      const supabase = createAdminClient();
      const { error } = await supabase.from("activity_logs").insert({
        actor_id: input.actorId,
        action: input.action,
        module: input.module,
        entity_type: input.entityType,
        entity_id: input.entityId,
        customer_id: input.customerId ?? null,
        metadata: input.metadata ?? {},
      });
      if (error) {
        console.error("activity_logs insert failed:", error.message);
      }
    } catch (error) {
      console.error("activity_logs insert failed:", error);
    }
  });
}
