/** Shared human-readable labels for activity_logs.action values. */
export const ACTIVITY_ACTION_LABELS: Record<string, string> = {
  CUSTOMER_CREATED: "Customer created",
  CUSTOMER_UPDATED: "Customer updated",
  CUSTOMER_DELETED: "Customer deleted",
  INQUIRY_CREATED: "Inquiry added",
  INQUIRY_UPDATED: "Inquiry updated",
  INQUIRY_DELETED: "Inquiry deleted",
  FOLLOWUP_CREATED: "Follow-up added",
  FOLLOWUP_UPDATED: "Follow-up updated",
  FOLLOWUP_DELETED: "Follow-up deleted",
  REMINDER_CREATED: "Reminder created",
  REMINDER_UPDATED: "Reminder updated",
  REMINDER_DELETED: "Reminder deleted",
  REMINDER_COMPLETED: "Reminder completed",
  REMINDER_REOPENED: "Reminder reopened",
  REMINDER_SNOOZED: "Reminder snoozed",
  NOTE_CREATED: "Note added",
  PRODUCT_PURCHASED: "Product purchased",
  PRODUCT_CREATED: "Product created",
  PRODUCT_UPDATED: "Product updated",
  PRODUCT_DELETED: "Product deleted",
  ROLE_CREATED: "Role created",
  ROLE_UPDATED: "Role updated",
  ROLE_DELETED: "Role deleted",
  EXCEL_IMPORT_INQUIRIES: "Excel import (inquiries)",
  EXCEL_IMPORT_CUSTOMERS: "Excel import (customers)",
};

export function formatActivityAction(action: string): string {
  return (
    ACTIVITY_ACTION_LABELS[action] ??
    action
      .toLowerCase()
      .split("_")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}
