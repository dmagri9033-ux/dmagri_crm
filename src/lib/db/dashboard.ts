import {
  endOfTodayIst,
  istCalendarDate,
  startOfTodayIst,
} from "@/lib/datetime/ist";
import { createClient } from "@/lib/supabase/server";

export type DashboardSummary = {
  customers: number;
  followUpRequired: number;
  inquiries: number;
  followups: number;
  openReminders: number;
  overdueReminders: number;
  todayReminders: number;
  upcomingReminders: number;
  activeProducts: number;
  unreadNotifications: number;
  myOpenInquiries: number;
};

export type DashboardInquiryDay = {
  date: string;
  count: number;
};

export type DashboardNamedCount = {
  name: string;
  count: number;
};

export type DashboardRecentInquiry = {
  id: string;
  inquiry_date: string;
  customer_id: string;
  customer_name: string;
  product_name: string;
  product_purchased: boolean;
};

export type DashboardReminderItem = {
  id: string;
  title: string;
  remind_at: string;
  customer_id: string;
  customer_name: string;
};

export type DashboardData = {
  summary: DashboardSummary;
  inquiriesByDay: DashboardInquiryDay[];
  inquiriesByType: DashboardNamedCount[];
  purchaseSplit: DashboardNamedCount[];
  recentInquiries: DashboardRecentInquiry[];
  overdueReminders: DashboardReminderItem[];
  todayReminders: DashboardReminderItem[];
};

function emptyDaySeries(days: number, now = new Date()): DashboardInquiryDay[] {
  const series: DashboardInquiryDay[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(startOfTodayIst(now).getTime() - i * 86_400_000);
    series.push({ date: istCalendarDate(d), count: 0 });
  }
  return series;
}

function oneName(
  value: { name: string } | { name: string }[] | null | undefined,
  snapshot?: string | null,
) {
  const row = Array.isArray(value) ? value[0] : value;
  return row?.name || snapshot || "Unknown";
}

export async function getDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();
  const now = new Date();
  const dayStart = startOfTodayIst(now).toISOString();
  const dayEnd = endOfTodayIst(now).toISOString();
  const seriesStart = istCalendarDate(
    new Date(startOfTodayIst(now).getTime() - 13 * 86_400_000),
  );

  const [
    customersRes,
    followUpRes,
    inquiriesRes,
    followupsRes,
    openRemindersRes,
    overdueCountRes,
    todayCountRes,
    upcomingCountRes,
    productsRes,
    unreadRes,
    myInquiriesRes,
    recentInquiriesRes,
    inquiryDaysRes,
    inquiryTypesRes,
    purchaseRes,
    overdueListRes,
    todayListRes,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("follow_up_required", true),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("followups")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("completed_at", null)
      .is("cancelled_at", null),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("completed_at", null)
      .is("cancelled_at", null)
      .lt("remind_at", dayStart),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("completed_at", null)
      .is("cancelled_at", null)
      .gte("remind_at", dayStart)
      .lte("remind_at", dayEnd),
    supabase
      .from("reminders")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .is("completed_at", null)
      .is("cancelled_at", null)
      .gt("remind_at", dayEnd),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("is_active", true),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .is("read_at", null),
    supabase
      .from("inquiries")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("assigned_user_id", userId),
    supabase
      .from("inquiries")
      .select(
        `
        id,
        inquiry_date,
        customer_id,
        product_purchased,
        customer_name_snapshot,
        product_name_snapshot,
        customers:customer_id ( name ),
        products:product_id ( name )
      `,
      )
      .is("deleted_at", null)
      .order("inquiry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("inquiries")
      .select("inquiry_date")
      .is("deleted_at", null)
      .gte("inquiry_date", seriesStart)
      .order("inquiry_date", { ascending: true })
      .limit(2000),
    supabase
      .from("inquiries")
      .select("customer_type")
      .is("deleted_at", null)
      .limit(5000),
    supabase
      .from("inquiries")
      .select("product_purchased")
      .is("deleted_at", null)
      .limit(5000),
    supabase
      .from("reminders")
      .select(
        `
        id,
        title,
        remind_at,
        customer_id,
        customers:customer_id ( name )
      `,
      )
      .is("deleted_at", null)
      .is("completed_at", null)
      .is("cancelled_at", null)
      .lt("remind_at", dayStart)
      .order("remind_at", { ascending: true })
      .limit(6),
    supabase
      .from("reminders")
      .select(
        `
        id,
        title,
        remind_at,
        customer_id,
        customers:customer_id ( name )
      `,
      )
      .is("deleted_at", null)
      .is("completed_at", null)
      .is("cancelled_at", null)
      .gte("remind_at", dayStart)
      .lte("remind_at", dayEnd)
      .order("remind_at", { ascending: true })
      .limit(6),
  ]);

  for (const res of [
    customersRes,
    followUpRes,
    inquiriesRes,
    followupsRes,
    openRemindersRes,
    overdueCountRes,
    todayCountRes,
    upcomingCountRes,
    productsRes,
    unreadRes,
    myInquiriesRes,
    recentInquiriesRes,
    inquiryDaysRes,
    inquiryTypesRes,
    purchaseRes,
    overdueListRes,
    todayListRes,
  ]) {
    if (res.error) throw new Error(res.error.message);
  }

  const dayMap = new Map(emptyDaySeries(14, now).map((d) => [d.date, 0]));
  for (const row of inquiryDaysRes.data ?? []) {
    if (dayMap.has(row.inquiry_date)) {
      dayMap.set(row.inquiry_date, (dayMap.get(row.inquiry_date) ?? 0) + 1);
    }
  }

  const typeCounts = new Map<string, number>();
  for (const row of inquiryTypesRes.data ?? []) {
    const key = row.customer_type?.trim() || "unset";
    typeCounts.set(key, (typeCounts.get(key) ?? 0) + 1);
  }

  let purchased = 0;
  let notPurchased = 0;
  for (const row of purchaseRes.data ?? []) {
    if (row.product_purchased) purchased += 1;
    else notPurchased += 1;
  }

  return {
    summary: {
      customers: customersRes.count ?? 0,
      followUpRequired: followUpRes.count ?? 0,
      inquiries: inquiriesRes.count ?? 0,
      followups: followupsRes.count ?? 0,
      openReminders: openRemindersRes.count ?? 0,
      overdueReminders: overdueCountRes.count ?? 0,
      todayReminders: todayCountRes.count ?? 0,
      upcomingReminders: upcomingCountRes.count ?? 0,
      activeProducts: productsRes.count ?? 0,
      unreadNotifications: unreadRes.count ?? 0,
      myOpenInquiries: myInquiriesRes.count ?? 0,
    },
    inquiriesByDay: [...dayMap.entries()].map(([date, count]) => ({
      date,
      count,
    })),
    inquiriesByType: [...typeCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    purchaseSplit: [
      { name: "Purchased", count: purchased },
      { name: "Not purchased", count: notPurchased },
    ],
    recentInquiries: (recentInquiriesRes.data ?? []).map((row) => ({
      id: row.id,
      inquiry_date: row.inquiry_date,
      customer_id: row.customer_id,
      customer_name: oneName(
        row.customers as { name: string } | { name: string }[] | null,
        row.customer_name_snapshot,
      ),
      product_name: oneName(
        row.products as { name: string } | { name: string }[] | null,
        row.product_name_snapshot,
      ),
      product_purchased: row.product_purchased,
    })),
    overdueReminders: (overdueListRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      remind_at: row.remind_at,
      customer_id: row.customer_id,
      customer_name: oneName(
        row.customers as { name: string } | { name: string }[] | null,
      ),
    })),
    todayReminders: (todayListRes.data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      remind_at: row.remind_at,
      customer_id: row.customer_id,
      customer_name: oneName(
        row.customers as { name: string } | { name: string }[] | null,
      ),
    })),
  };
}
