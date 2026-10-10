import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  MessageSquarePlus,
  Bell,
  Package,
  Users,
  PhoneForwarded,
  Shield,
  UserCog,
  ScrollText,
  LayoutTemplate,
} from "lucide-react";
import type { PermissionCode } from "@/lib/rbac/permissions";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Permission required to see this nav item / enter the module */
  permission: PermissionCode;
  /** Implementation phase when this module becomes functional */
  phase: number;
};

export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    permission: "dashboard.view",
    phase: 13,
  },
  {
    title: "Inquiries",
    href: "/inquiries",
    icon: MessageSquarePlus,
    permission: "inquiry.view",
    phase: 8,
  },
  {
    title: "Follow-ups",
    href: "/follow-ups",
    icon: PhoneForwarded,
    permission: "followup.view",
    phase: 9,
  },
  {
    title: "Reminders",
    href: "/reminders",
    icon: Bell,
    permission: "reminder.view",
    phase: 10,
  },
  {
    title: "Customers",
    href: "/customers",
    icon: Users,
    permission: "customer.view",
    phase: 6,
  },
  {
    title: "Products",
    href: "/products",
    icon: Package,
    permission: "product.view",
    phase: 5,
  },
  {
    title: "Templates",
    href: "/templates",
    icon: LayoutTemplate,
    permission: "template.view",
    phase: 11,
  },
  {
    title: "Activity",
    href: "/activity",
    icon: ScrollText,
    permission: "activity.view",
    phase: 14,
  },
  {
    title: "Roles",
    href: "/roles",
    icon: Shield,
    permission: "role.view",
    phase: 4,
  },
  {
    title: "Users",
    href: "/users",
    icon: UserCog,
    permission: "user.view",
    phase: 4,
  },
];
