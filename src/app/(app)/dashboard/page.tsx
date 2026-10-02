import { DashboardCharts } from "@/features/dashboard/dashboard-charts";
import { DashboardSummaryCards } from "@/features/dashboard/dashboard-summary-cards";
import {
  DashboardRecentInquiries,
  DashboardReminderWidgets,
} from "@/features/dashboard/dashboard-widgets";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { getDashboardData } from "@/lib/db/dashboard";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";

export default async function DashboardPage() {
  const ctx = await requirePagePermission("dashboard.view");
  if (!ctx) return <PageForbidden />;

  const data = await getDashboardData(ctx.userId);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome, {ctx.profile.display_name}
        </h2>
      </div>

      <DashboardSummaryCards summary={data.summary} />

      <DashboardCharts
        inquiriesByDay={data.inquiriesByDay}
        inquiriesByType={data.inquiriesByType}
        purchaseSplit={data.purchaseSplit}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardRecentInquiries inquiries={data.recentInquiries} />
        <DashboardReminderWidgets
          overdue={data.overdueReminders}
          today={data.todayReminders}
        />
      </div>
    </div>
  );
}
