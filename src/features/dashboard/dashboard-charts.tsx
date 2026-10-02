"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  DashboardInquiryDay,
  DashboardNamedCount,
} from "@/lib/db/dashboard";

const BAR_COLOR = "oklch(0.45 0.08 150)";
const PIE_COLORS = [
  "oklch(0.55 0.12 150)",
  "oklch(0.72 0.08 85)",
  "oklch(0.62 0.1 220)",
  "oklch(0.5 0.08 30)",
  "oklch(0.65 0.06 300)",
];

export function DashboardCharts({
  inquiriesByDay,
  inquiriesByType,
  purchaseSplit,
}: {
  inquiriesByDay: DashboardInquiryDay[];
  inquiriesByType: DashboardNamedCount[];
  purchaseSplit: DashboardNamedCount[];
}) {
  const hasDayData = inquiriesByDay.some((d) => d.count > 0);
  const hasTypeData = inquiriesByType.some((d) => d.count > 0);
  const hasPurchaseData = purchaseSplit.some((d) => d.count > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Inquiries · last 14 days</CardTitle>
          <CardDescription>Counts by inquiry date (IST calendar)</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {hasDayData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={inquiriesByDay}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={28} />
                <Tooltip />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No inquiries in the last 14 days." />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Inquiries by customer type</CardTitle>
          <CardDescription>All-time mix from inquiry records</CardDescription>
        </CardHeader>
        <CardContent className="h-64">
          {hasTypeData ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={inquiriesByType}
                  dataKey="count"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {inquiriesByType.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No inquiry type data yet." />
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Purchase outcome</CardTitle>
          <CardDescription>Purchased vs not purchased on inquiries</CardDescription>
        </CardHeader>
        <CardContent className="h-56">
          {hasPurchaseData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchaseSplit} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChart message="No purchase data yet." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
      {message}
    </div>
  );
}
