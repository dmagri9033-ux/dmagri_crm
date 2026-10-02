import { z } from "zod";

export const reminderStatusFilterValues = [
  "all",
  "open",
  "overdue",
  "today",
  "upcoming",
  "completed",
  "cancelled",
] as const;

export const reminderFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  customer_id: z.string().uuid("Select a customer"),
  inquiry_id: z
    .union([z.string().uuid(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  remind_at_local: z.string().min(1, "Date & time are required"),
  notes: z.string().trim().max(5000).optional().or(z.literal("")),
  assigned_user_id: z.string().uuid("Select an assignee"),
});

export const reminderFilterSchema = z.object({
  search: z.string().trim().optional().default(""),
  status: z.enum(reminderStatusFilterValues).optional().default("open"),
  assignedUserId: z.string().uuid().optional().or(z.literal("")).default(""),
  customerId: z.string().uuid().optional().or(z.literal("")).default(""),
  dateFrom: z.string().optional().default(""),
  dateTo: z.string().optional().default(""),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).optional().default(25),
});

export const snoozeReminderSchema = z.object({
  reminderId: z.string().uuid(),
  until_local: z.string().min(1, "Snooze time is required"),
});

export type ReminderFormInput = z.infer<typeof reminderFormSchema>;
export type ReminderFilterInput = z.infer<typeof reminderFilterSchema>;
