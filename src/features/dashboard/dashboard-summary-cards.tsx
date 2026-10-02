import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { DashboardSummary } from "@/lib/db/dashboard";

const CARDS: {
  key: keyof DashboardSummary;
  label: string;
  href: string;
  hint?: string;
}[] = [
  { key: "customers", label: "Customers", href: "/customers" },
  {
    key: "followUpRequired",
    label: "Follow-up required",
    href: "/customers?followUp=yes",
    hint: "Manual customer flag",
  },
  { key: "inquiries", label: "Inquiries", href: "/inquiries" },
  { key: "myOpenInquiries", label: "My inquiries", href: "/inquiries" },
  { key: "followups", label: "Follow-ups", href: "/follow-ups" },
  { key: "openReminders", label: "Open reminders", href: "/reminders?status=open" },
  {
    key: "overdueReminders",
    label: "Overdue reminders",
    href: "/reminders?status=overdue",
  },
  { key: "todayReminders", label: "Today reminders", href: "/reminders?status=today" },
  { key: "activeProducts", label: "Active products", href: "/products" },
  { key: "unreadNotifications", label: "Unread alerts", href: "/reminders" },
];

export function DashboardSummaryCards({ summary }: { summary: DashboardSummary }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {CARDS.map((card) => (
        <Link key={card.key} href={card.href} className="block">
          <Card size="sm" className="h-full transition-colors hover:bg-muted/40">
            <CardHeader className="pb-0">
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {summary[card.key]}
              </CardTitle>
            </CardHeader>
            {card.hint ? (
              <CardContent className="pt-0 text-xs text-muted-foreground">
                {card.hint}
              </CardContent>
            ) : null}
          </Card>
        </Link>
      ))}
    </div>
  );
}
