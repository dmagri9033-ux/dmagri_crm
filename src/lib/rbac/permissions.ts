export const PERMISSION_CODES = [
  "dashboard.view",
  "inquiry.view",
  "inquiry.create",
  "inquiry.update",
  "inquiry.delete",
  "inquiry.import",
  "inquiry.export",
  "customer.view",
  "customer.create",
  "customer.update",
  "customer.delete",
  "customer.import",
  "customer.export",
  "product.view",
  "product.create",
  "product.update",
  "product.delete",
  "product.export",
  "reminder.view",
  "reminder.create",
  "reminder.update",
  "reminder.delete",
  "reminder.complete",
  "reminder.export",
  "followup.view",
  "followup.create",
  "followup.update",
  "followup.delete",
  "followup.export",
  "role.view",
  "role.create",
  "role.update",
  "role.delete",
  "user.view",
  "user.create",
  "user.update",
  "user.delete",
  "user.reset_password",
  "user.export",
  "activity.view",
  "activity.export",
  "template.view",
  "template.create",
  "template.update",
  "template.delete",
] as const;

export type PermissionCode = (typeof PERMISSION_CODES)[number];

export function isPermissionCode(value: string): value is PermissionCode {
  return (PERMISSION_CODES as readonly string[]).includes(value);
}

/** Permissions considered "administrator-level" for last-admin protection. */
export const ADMIN_GATE_PERMISSIONS: PermissionCode[] = [
  "role.update",
  "user.update",
];

export const PERMISSION_MODULES: {
  module: string;
  label: string;
  permissions: { code: PermissionCode; label: string }[];
}[] = [
  {
    module: "dashboard",
    label: "Dashboard",
    permissions: [{ code: "dashboard.view", label: "View" }],
  },
  {
    module: "inquiries",
    label: "Inquiries",
    permissions: [
      { code: "inquiry.view", label: "View" },
      { code: "inquiry.create", label: "Create" },
      { code: "inquiry.update", label: "Update" },
      { code: "inquiry.delete", label: "Delete" },
      { code: "inquiry.import", label: "Import" },
      { code: "inquiry.export", label: "Export" },
    ],
  },
  {
    module: "customers",
    label: "Customers",
    permissions: [
      { code: "customer.view", label: "View" },
      { code: "customer.create", label: "Create" },
      { code: "customer.update", label: "Update" },
      { code: "customer.delete", label: "Delete" },
      { code: "customer.import", label: "Import" },
      { code: "customer.export", label: "Export" },
    ],
  },
  {
    module: "products",
    label: "Products",
    permissions: [
      { code: "product.view", label: "View" },
      { code: "product.create", label: "Create" },
      { code: "product.update", label: "Update" },
      { code: "product.delete", label: "Delete" },
      { code: "product.export", label: "Export" },
    ],
  },
  {
    module: "reminders",
    label: "Reminders",
    permissions: [
      { code: "reminder.view", label: "View" },
      { code: "reminder.create", label: "Create" },
      { code: "reminder.update", label: "Update" },
      { code: "reminder.delete", label: "Delete" },
      { code: "reminder.complete", label: "Complete" },
      { code: "reminder.export", label: "Export" },
    ],
  },
  {
    module: "followups",
    label: "Follow-ups",
    permissions: [
      { code: "followup.view", label: "View" },
      { code: "followup.create", label: "Create" },
      { code: "followup.update", label: "Update" },
      { code: "followup.delete", label: "Delete" },
      { code: "followup.export", label: "Export" },
    ],
  },
  {
    module: "roles",
    label: "Roles",
    permissions: [
      { code: "role.view", label: "View" },
      { code: "role.create", label: "Create" },
      { code: "role.update", label: "Update" },
      { code: "role.delete", label: "Delete" },
    ],
  },
  {
    module: "users",
    label: "Users",
    permissions: [
      { code: "user.view", label: "View" },
      { code: "user.create", label: "Create" },
      { code: "user.update", label: "Update" },
      { code: "user.delete", label: "Delete" },
      { code: "user.reset_password", label: "Reset password" },
      { code: "user.export", label: "Export" },
    ],
  },
  {
    module: "activity",
    label: "Activity",
    permissions: [
      { code: "activity.view", label: "View" },
      { code: "activity.export", label: "Export" },
    ],
  },
  {
    module: "templates",
    label: "Templates",
    permissions: [
      { code: "template.view", label: "View" },
      { code: "template.create", label: "Create" },
      { code: "template.update", label: "Update" },
      { code: "template.delete", label: "Delete" },
    ],
  },
];
