import { createClient } from "@/lib/supabase/server";
import { getReminderUiStatus, type ReminderUiStatus } from "@/lib/datetime/ist";
import type { Tables } from "@/types/database.types";
import type { CustomerWithProduct } from "@/lib/db/customers";

export type ProfileLite = Pick<Tables<"profiles">, "id" | "display_name" | "email">;
export type ProductLite = Pick<Tables<"products">, "id" | "name" | "is_active">;

export type Customer360Inquiry = Tables<"inquiries"> & {
  products: ProductLite | null;
  created_by_profile: ProfileLite | null;
};

export type Customer360Purchase = Tables<"customer_product_purchases"> & {
  products: ProductLite | null;
};

export type Customer360Followup = Tables<"followups"> & {
  created_by_profile: ProfileLite | null;
};

export type Customer360Reminder = Tables<"reminders"> & {
  ui_status: ReminderUiStatus;
  assigned_profile: ProfileLite | null;
};

export type Customer360Note = Tables<"customer_notes"> & {
  created_by_profile: ProfileLite | null;
};

export type Customer360Activity = Tables<"activity_logs"> & {
  actor: ProfileLite | null;
};

export type Customer360Data = {
  customer: CustomerWithProduct & {
    assigned_profile: ProfileLite | null;
  };
  inquiries: Customer360Inquiry[];
  purchases: Customer360Purchase[];
  followups: Customer360Followup[];
  reminders: {
    overdue: Customer360Reminder[];
    today: Customer360Reminder[];
    upcoming: Customer360Reminder[];
    completed: Customer360Reminder[];
  };
  notes: Customer360Note[];
  activity: Customer360Activity[];
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function getCustomer360(
  customerId: string,
): Promise<Customer360Data | null> {
  const supabase = await createClient();

  const [
    customerRes,
    inquiriesRes,
    purchasesRes,
    followupsRes,
    remindersRes,
    notesRes,
    activityRes,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select(
        `
        *,
        products:primary_product_id ( id, name, is_active ),
        assigned_profile:assigned_user_id ( id, display_name, email )
      `,
      )
      .eq("id", customerId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("inquiries")
      .select(
        `
        *,
        products:product_id ( id, name, is_active ),
        created_by_profile:created_by ( id, display_name, email )
      `,
      )
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("inquiry_date", { ascending: false })
      .limit(50),
    supabase
      .from("customer_product_purchases")
      .select(
        `
        *,
        products:product_id ( id, name, is_active )
      `,
      )
      .eq("customer_id", customerId)
      .order("purchased_at", { ascending: false })
      .limit(50),
    supabase
      .from("followups")
      .select(
        `
        *,
        created_by_profile:created_by ( id, display_name, email )
      `,
      )
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("followup_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("reminders")
      .select(
        `
        *,
        assigned_profile:assigned_user_id ( id, display_name, email )
      `,
      )
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("remind_at", { ascending: true })
      .limit(50),
    supabase
      .from("customer_notes")
      .select(
        `
        *,
        created_by_profile:created_by ( id, display_name, email )
      `,
      )
      .eq("customer_id", customerId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("activity_logs")
      .select(
        `
        *,
        actor:actor_id ( id, display_name, email )
      `,
      )
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (customerRes.error) throw new Error(customerRes.error.message);
  if (!customerRes.data) return null;

  for (const res of [
    inquiriesRes,
    purchasesRes,
    followupsRes,
    remindersRes,
    notesRes,
    activityRes,
  ]) {
    if (res.error) throw new Error(res.error.message);
  }

  const customerRow = customerRes.data as never as CustomerWithProduct & {
    assigned_profile: ProfileLite | ProfileLite[] | null;
    products: ProductLite | ProductLite[] | null;
  };

  const reminders = (remindersRes.data ?? []).map((row) => {
    const r = row as never as Tables<"reminders"> & {
      assigned_profile: ProfileLite | ProfileLite[] | null;
    };
    return {
      ...r,
      assigned_profile: one(r.assigned_profile),
      ui_status: getReminderUiStatus(
        r.remind_at,
        r.completed_at,
        r.cancelled_at,
        r.snoozed_until,
      ),
    };
  });

  return {
    customer: {
      ...customerRow,
      products: one(customerRow.products),
      assigned_profile: one(customerRow.assigned_profile),
    },
    inquiries: (inquiriesRes.data ?? []).map((row) => {
      const r = row as never as Tables<"inquiries"> & {
        products: ProductLite | ProductLite[] | null;
        created_by_profile: ProfileLite | ProfileLite[] | null;
      };
      return {
        ...r,
        products: one(r.products),
        created_by_profile: one(r.created_by_profile),
      };
    }),
    purchases: (purchasesRes.data ?? []).map((row) => {
      const r = row as never as Tables<"customer_product_purchases"> & {
        products: ProductLite | ProductLite[] | null;
      };
      return { ...r, products: one(r.products) };
    }),
    followups: (followupsRes.data ?? []).map((row) => {
      const r = row as never as Tables<"followups"> & {
        created_by_profile: ProfileLite | ProfileLite[] | null;
      };
      return { ...r, created_by_profile: one(r.created_by_profile) };
    }),
    reminders: {
      overdue: reminders.filter((r) => r.ui_status === "overdue"),
      today: reminders.filter((r) => r.ui_status === "today"),
      upcoming: reminders.filter((r) => r.ui_status === "upcoming"),
      completed: reminders.filter(
        (r) => r.ui_status === "completed" || r.ui_status === "cancelled",
      ),
    },
    notes: (notesRes.data ?? []).map((row) => {
      const r = row as never as Tables<"customer_notes"> & {
        created_by_profile: ProfileLite | ProfileLite[] | null;
      };
      return { ...r, created_by_profile: one(r.created_by_profile) };
    }),
    activity: (activityRes.data ?? []).map((row) => {
      const r = row as never as Tables<"activity_logs"> & {
        actor: ProfileLite | ProfileLite[] | null;
      };
      return { ...r, actor: one(r.actor) };
    }),
  };
}
