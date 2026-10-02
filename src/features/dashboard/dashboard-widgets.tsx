import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatIstDate, formatIstDateTime } from "@/lib/datetime/ist";
import type {
  DashboardRecentInquiry,
  DashboardReminderItem,
} from "@/lib/db/dashboard";

export function DashboardRecentInquiries({
  inquiries,
}: {
  inquiries: DashboardRecentInquiry[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent inquiries</CardTitle>
        <CardDescription>Latest activity across the team</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {inquiries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No inquiries yet.</p>
        ) : (
          inquiries.map((inquiry) => (
            <Link
              key={inquiry.id}
              href={`/customers/${inquiry.customer_id}`}
              className="block rounded-lg border px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{inquiry.customer_name}</span>
                <Badge variant={inquiry.product_purchased ? "secondary" : "outline"}>
                  {inquiry.product_purchased ? "Purchased" : "Open"}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatIstDate(inquiry.inquiry_date)} · {inquiry.product_name}
              </p>
            </Link>
          ))
        )}
        <ButtonLink href="/inquiries">View all inquiries</ButtonLink>
      </CardContent>
    </Card>
  );
}

export function DashboardReminderWidgets({
  overdue,
  today,
}: {
  overdue: DashboardReminderItem[];
  today: DashboardReminderItem[];
}) {
  return (
    <div className="grid gap-4">
      <ReminderList
        title="Overdue reminders"
        description="Past due (IST day boundaries)"
        items={overdue}
        empty="Nothing overdue."
        href="/reminders?status=overdue"
        tone="destructive"
      />
      <ReminderList
        title="Today’s reminders"
        description="Due before end of day IST"
        items={today}
        empty="No reminders due today."
        href="/reminders?status=today"
        tone="secondary"
      />
    </div>
  );
}

function ReminderList({
  title,
  description,
  items,
  empty,
  href,
  tone,
}: {
  title: string;
  description: string;
  items: DashboardReminderItem[];
  empty: string;
  href: string;
  tone: "destructive" | "secondary";
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant={tone}>{items.length}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/customers/${item.customer_id}`}
              className="block rounded-lg border px-3 py-2 transition-colors hover:bg-muted/40"
            >
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatIstDateTime(item.remind_at)} · {item.customer_name}
              </p>
            </Link>
          ))
        )}
        <ButtonLink href={href}>Open reminders</ButtonLink>
      </CardContent>
    </Card>
  );
}

function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
    >
      {children}
    </Link>
  );
}
