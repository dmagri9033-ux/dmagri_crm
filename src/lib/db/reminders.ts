import {
  endOfTodayIst,
  getReminderUiStatus,
  isActivelySnoozed,
  startOfTodayIst,
  type ReminderUiStatus,
} from "@/lib/datetime/ist";
import { collectPagesForExport } from "@/lib/db/export-pages";
import { administratorCreatorOrFilter } from "@/lib/rbac/administrator";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database.types";
import {
  reminderFilterSchema,
  type ReminderFilterInput,
} from "@/validations/reminder";

export type ProfileLite = Pick<Tables<"profiles">, "id" | "display_name" | "email">;
export type ProductLite = Pick<Tables<"products">, "id" | "name" | "is_active">;
export type CustomerLite = Pick<
  Tables<"customers">,
  "id" | "name" | "mobile" | "mobile_normalized" | "customer_type" | "primary_product_id"
> & {
  products: ProductLite | null;
};
export type InquiryLite = Pick<
  Tables<"inquiries">,
  "id" | "inquiry_date" | "product_name_snapshot" | "customer_id" | "product_id"
> & {
  products: ProductLite | null;
};

export type ReminderWithRelations = Tables<"reminders"> & {
  customers: CustomerLite | null;
  inquiries: InquiryLite | null;
  assigned_profile: ProfileLite | null;
  created_by_profile: ProfileLite | null;
  ui_status: ReminderUiStatus;
  actively_snoozed: boolean;
  /** Inquiry product if linked, otherwise customer primary product. */
  product_name: string | null;
};

export type ReminderListResult = {
  reminders: ReminderWithRelations[];
  total: number;
  page: number;
  pageSize: number;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function mapCustomer(
  value:
    | (Omit<CustomerLite, "products"> & {
        products: ProductLite | ProductLite[] | null;
      })
    | (Omit<CustomerLite, "products"> & {
        products: ProductLite | ProductLite[] | null;
      })[]
    | null
    | undefined,
): CustomerLite | null {
  const row = one(value);
  if (!row) return null;
  return { ...row, products: one(row.products) };
}

function mapInquiry(
  value:
    | (Omit<InquiryLite, "products"> & {
        products: ProductLite | ProductLite[] | null;
      })
    | (Omit<InquiryLite, "products"> & {
        products: ProductLite | ProductLite[] | null;
      })[]
    | null
    | undefined,
): InquiryLite | null {
  const row = one(value);
  if (!row) return null;
  return { ...row, products: one(row.products) };
}

function resolveProductName(
  customer: CustomerLite | null,
  inquiry: InquiryLite | null,
): string | null {
  const fromInquiry =
    inquiry?.product_name_snapshot?.trim() ||
    inquiry?.products?.name?.trim() ||
    null;
  if (fromInquiry) return fromInquiry;
  return customer?.products?.name?.trim() || null;
}

function mapReminder(row: never, now = new Date()): ReminderWithRelations {
  const r = row as Tables<"reminders"> & {
    customers:
      | (Omit<CustomerLite, "products"> & {
          products: ProductLite | ProductLite[] | null;
        })
      | (Omit<CustomerLite, "products"> & {
          products: ProductLite | ProductLite[] | null;
        })[]
      | null;
    inquiries:
      | (Omit<InquiryLite, "products"> & {
          products: ProductLite | ProductLite[] | null;
        })
      | (Omit<InquiryLite, "products"> & {
          products: ProductLite | ProductLite[] | null;
        })[]
      | null;
    assigned_profile: ProfileLite | ProfileLite[] | null;
    created_by_profile: ProfileLite | ProfileLite[] | null;
  };
  const customers = mapCustomer(r.customers);
  const inquiries = mapInquiry(r.inquiries);
  return {
    ...r,
    customers,
    inquiries,
    assigned_profile: one(r.assigned_profile),
    created_by_profile: one(r.created_by_profile),
    product_name: resolveProductName(customers, inquiries),
    ui_status: getReminderUiStatus(
      r.remind_at,
      r.completed_at,
      r.cancelled_at,
      r.snoozed_until,
      now,
    ),
    actively_snoozed: isActivelySnoozed(r.snoozed_until, now),
  };
}

const REMINDER_SELECT = `
  *,
  customers:customer_id (
    id, name, mobile, mobile_normalized, customer_type, primary_product_id,
    products:primary_product_id ( id, name, is_active )
  ),
  inquiries:inquiry_id (
    id, inquiry_date, product_name_snapshot, customer_id, product_id,
    products:product_id ( id, name, is_active )
  ),
  assigned_profile:assigned_user_id ( id, display_name, email ),
  created_by_profile:created_by ( id, display_name, email )
`;

export async function listAssigneeProfiles(): Promise<ProfileLite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("display_name", { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function listReminders(
  rawFilters: Partial<ReminderFilterInput> = {},
): Promise<ReminderListResult> {
  const filters = reminderFilterSchema.parse(rawFilters);
  const now = new Date();
  const dayStart = startOfTodayIst(now).toISOString();
  const dayEnd = endOfTodayIst(now).toISOString();
  const [supabase, hideAdminCreated] = await Promise.all([
    createClient(),
    administratorCreatorOrFilter(),
  ]);

  let query = supabase
    .from("reminders")
    .select(REMINDER_SELECT, { count: "exact" })
    .is("deleted_at", null);

  if (filters.search) {
    const q = filters.search;
    const { data: matchedCustomers } = await supabase
      .from("customers")
      .select("id")
      .is("deleted_at", null)
      .or(`name.ilike.%${q}%,mobile.ilike.%${q}%,mobile_normalized.ilike.%${q}%`)
      .limit(50);
    const customerIds = (matchedCustomers ?? []).map((c) => c.id);
    if (customerIds.length > 0) {
      query = query.or(
        `title.ilike.%${q}%,notes.ilike.%${q}%,customer_id.in.(${customerIds.join(",")})`,
      );
    } else {
      query = query.or(`title.ilike.%${q}%,notes.ilike.%${q}%`);
    }
  }

  if (filters.assignedUserId) {
    query = query.eq("assigned_user_id", filters.assignedUserId);
  }
  if (filters.customerId) {
    query = query.eq("customer_id", filters.customerId);
  }
  if (filters.customerType && filters.customerType !== "all") {
    const { data: typedCustomers, error: typeError } = await supabase
      .from("customers")
      .select("id")
      .eq("customer_type", filters.customerType)
      .is("deleted_at", null)
      .limit(500);
    if (typeError) throw new Error(typeError.message);
    const typeIds = (typedCustomers ?? []).map((c) => c.id);
    if (typeIds.length === 0) {
      return {
        reminders: [],
        total: 0,
        page: filters.page,
        pageSize: filters.pageSize,
      };
    }
    query = query.in("customer_id", typeIds);
  }
  if (filters.dateFrom) {
    query = query.gte("remind_at", `${filters.dateFrom}T00:00:00+05:30`);
  }
  if (filters.dateTo) {
    query = query.lte("remind_at", `${filters.dateTo}T23:59:59.999+05:30`);
  }

  switch (filters.status) {
    case "open":
      query = query.is("completed_at", null).is("cancelled_at", null);
      break;
    case "completed":
      query = query.not("completed_at", "is", null);
      break;
    case "cancelled":
      query = query.is("completed_at", null).not("cancelled_at", "is", null);
      break;
    case "overdue":
      query = query
        .is("completed_at", null)
        .is("cancelled_at", null)
        .lt("remind_at", dayStart);
      break;
    case "today":
      query = query
        .is("completed_at", null)
        .is("cancelled_at", null)
        .gte("remind_at", dayStart)
        .lte("remind_at", dayEnd);
      break;
    case "upcoming":
      query = query
        .is("completed_at", null)
        .is("cancelled_at", null)
        .gt("remind_at", dayEnd);
      break;
    default:
      break;
  }

  if (hideAdminCreated) query = query.or(hideAdminCreated);

  const from = (filters.page - 1) * filters.pageSize;
  const to = from + filters.pageSize - 1;

  const { data, error, count } = await query
    .order("remind_at", { ascending: true })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) throw new Error(error.message);

  return {
    reminders: (data ?? []).map((row) => mapReminder(row as never, now)),
    total: count ?? 0,
    page: filters.page,
    pageSize: filters.pageSize,
  };
}

/** Unpaginated list for Excel export (capped). */
export async function listRemindersForExport(
  rawFilters: Partial<ReminderFilterInput> = {},
  limit = 5000,
): Promise<ReminderWithRelations[]> {
  return collectPagesForExport({
    filters: rawFilters,
    limit,
    list: async (filters) => {
      const result = await listReminders(filters);
      return {
        items: result.reminders,
        total: result.total,
        pageSize: result.pageSize,
      };
    },
  });
}

export async function getReminderById(
  id: string,
): Promise<ReminderWithRelations | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select(REMINDER_SELECT)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapReminder(data as never);
}

export async function createReminderRecord(input: {
  userId: string;
  title: string;
  customer_id: string;
  inquiry_id?: string | null;
  remind_at: string;
  notes?: string | null;
  assigned_user_id: string;
}) {
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers")
    .select("id")
    .eq("id", input.customer_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!customer) throw new Error("Customer not found");

  let inquiryId = input.inquiry_id?.trim() || null;
  if (inquiryId) {
    const { data: inquiry } = await supabase
      .from("inquiries")
      .select("id, customer_id")
      .eq("id", inquiryId)
      .is("deleted_at", null)
      .maybeSingle();
    if (!inquiry) throw new Error("Inquiry not found");
    if (inquiry.customer_id !== input.customer_id) {
      throw new Error("Inquiry does not belong to this customer");
    }
  }

  const { data, error } = await supabase
    .from("reminders")
    .insert({
      title: input.title.trim(),
      customer_id: input.customer_id,
      inquiry_id: inquiryId,
      remind_at: input.remind_at,
      notes: input.notes?.trim() || null,
      assigned_user_id: input.assigned_user_id,
      created_by: input.userId,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

/** Cron-ready: open reminders due at or before `until` (UTC ISO). */
export async function listDueOpenReminders(untilIso: string, limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reminders")
    .select("id, title, customer_id, assigned_user_id, remind_at, snoozed_until")
    .is("deleted_at", null)
    .is("completed_at", null)
    .is("cancelled_at", null)
    .lte("remind_at", untilIso)
    .order("remind_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}
