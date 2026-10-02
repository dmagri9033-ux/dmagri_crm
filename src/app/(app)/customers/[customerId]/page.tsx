import { notFound } from "next/navigation";
import { PageForbidden } from "@/components/shared/page-forbidden";
import { Customer360Activity } from "@/features/customer-360/customer-360-activity";
import { Customer360Followups } from "@/features/customer-360/customer-360-followups";
import { Customer360Header } from "@/features/customer-360/customer-360-header";
import { Customer360Inquiries } from "@/features/customer-360/customer-360-inquiries";
import { Customer360Notes } from "@/features/customer-360/customer-360-notes";
import { Customer360Profile } from "@/features/customer-360/customer-360-profile";
import { Customer360Purchases } from "@/features/customer-360/customer-360-purchases";
import { Customer360Reminders } from "@/features/customer-360/customer-360-reminders";
import { Customer360Section } from "@/features/customer-360/customer-360-section";
import { getCustomer360 } from "@/lib/db/customer-360";
import { listActiveProducts } from "@/lib/db/products";
import { requirePagePermission } from "@/lib/rbac/require-page-permission";

export default async function Customer360Page({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const ctx = await requirePagePermission("customer.view");
  if (!ctx) return <PageForbidden />;

  const { customerId } = await params;
  const [data, products] = await Promise.all([
    getCustomer360(customerId),
    listActiveProducts(),
  ]);

  if (!data) notFound();

  const reminderCount =
    data.reminders.overdue.length +
    data.reminders.today.length +
    data.reminders.upcoming.length +
    data.reminders.completed.length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <Customer360Header data={data} products={products} />

      <nav className="flex flex-wrap gap-2 text-xs">
        {[
          ["profile", "Profile"],
          ["inquiries", "Inquiries"],
          ["purchases", "Purchases"],
          ["follow-ups", "Follow-ups"],
          ["reminders", "Reminders"],
          ["notes", "Notes"],
          ["activity", "Activity"],
        ].map(([hash, label]) => (
          <a
            key={hash}
            href={`#${hash}`}
            className="rounded-md border bg-card px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
          >
            {label}
          </a>
        ))}
      </nav>

      <Customer360Section id="profile" title="Customer profile">
        <Customer360Profile data={data} />
      </Customer360Section>

      <Customer360Section
        id="inquiries"
        title="Inquiry history"
        count={data.inquiries.length}
      >
        <Customer360Inquiries inquiries={data.inquiries} />
      </Customer360Section>

      <Customer360Section
        id="purchases"
        title="Purchased products"
        count={data.purchases.length}
      >
        <Customer360Purchases purchases={data.purchases} />
      </Customer360Section>

      <Customer360Section
        id="follow-ups"
        title="Follow-up history"
        count={data.followups.length}
      >
        <Customer360Followups followups={data.followups} />
      </Customer360Section>

      <Customer360Section id="reminders" title="Reminders" count={reminderCount}>
        <Customer360Reminders
          customerId={data.customer.id}
          reminders={data.reminders}
        />
      </Customer360Section>

      <Customer360Section id="notes" title="Notes" count={data.notes.length}>
        <Customer360Notes customerId={data.customer.id} notes={data.notes} />
      </Customer360Section>

      <Customer360Section
        id="activity"
        title="Activity timeline"
        count={data.activity.length}
        defaultOpen
      >
        <Customer360Activity activity={data.activity} />
      </Customer360Section>
    </div>
  );
}
