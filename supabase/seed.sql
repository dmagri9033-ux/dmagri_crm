-- DM Agree CRM — seed permissions + default roles
-- Safe to re-run (uses ON CONFLICT / existence checks). Does NOT create admin passwords.

-- ---------------------------------------------------------------------------
-- Permissions catalog
-- ---------------------------------------------------------------------------

INSERT INTO public.permissions (code, module, description) VALUES
  ('dashboard.view', 'dashboard', 'View dashboard and widgets'),

  ('inquiry.view', 'inquiries', 'List and view inquiries'),
  ('inquiry.create', 'inquiries', 'Create inquiries'),
  ('inquiry.update', 'inquiries', 'Edit inquiries'),
  ('inquiry.delete', 'inquiries', 'Delete inquiries'),
  ('inquiry.import', 'inquiries', 'Excel import inquiries'),
  ('inquiry.export', 'inquiries', 'Excel export inquiries'),

  ('customer.view', 'customers', 'List and view customers'),
  ('customer.create', 'customers', 'Create customers'),
  ('customer.update', 'customers', 'Edit customers'),
  ('customer.delete', 'customers', 'Delete customers'),
  ('customer.import', 'customers', 'Excel import customers'),
  ('customer.export', 'customers', 'Excel export customers'),

  ('product.view', 'products', 'List products'),
  ('product.create', 'products', 'Create products'),
  ('product.update', 'products', 'Edit / activate / deactivate products'),
  ('product.delete', 'products', 'Delete products with safeguards'),
  ('product.export', 'products', 'Excel export products'),

  ('reminder.view', 'reminders', 'List reminders'),
  ('reminder.create', 'reminders', 'Create reminders'),
  ('reminder.update', 'reminders', 'Edit, snooze, reopen reminders'),
  ('reminder.delete', 'reminders', 'Delete reminders'),
  ('reminder.complete', 'reminders', 'Mark reminders complete'),
  ('reminder.export', 'reminders', 'Excel export reminders'),

  ('followup.view', 'followups', 'List and view follow-ups'),
  ('followup.create', 'followups', 'Add follow-ups'),
  ('followup.update', 'followups', 'Edit follow-ups'),
  ('followup.delete', 'followups', 'Delete follow-ups'),
  ('followup.export', 'followups', 'Excel export follow-ups'),

  ('role.view', 'roles', 'List roles'),
  ('role.create', 'roles', 'Create roles'),
  ('role.update', 'roles', 'Edit role permissions'),
  ('role.delete', 'roles', 'Delete roles'),

  ('user.view', 'users', 'List users'),
  ('user.create', 'users', 'Create users'),
  ('user.update', 'users', 'Edit users / activate / deactivate'),
  ('user.delete', 'users', 'Delete or deactivate users'),
  ('user.reset_password', 'users', 'Trigger password reset for another user'),
  ('user.export', 'users', 'Excel export users'),

  ('activity.view', 'activity', 'View global activity log'),
  ('activity.export', 'activity', 'Excel export activity logs')
ON CONFLICT (code) DO UPDATE
SET
  module = EXCLUDED.module,
  description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

INSERT INTO public.roles (id, name, description, is_system)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'Administrator',
    'Full system access',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Sales Executive',
    'Day-to-day CRM operations',
    false
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Read-only Auditor',
    'View-only access for audit',
    false
  )
ON CONFLICT (name) DO UPDATE
SET
  description = EXCLUDED.description,
  is_system = EXCLUDED.is_system,
  deleted_at = NULL;

-- Administrator: all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'Administrator'
ON CONFLICT DO NOTHING;

-- Sales Executive: operational subset
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'dashboard.view',
  'inquiry.view', 'inquiry.create', 'inquiry.update', 'inquiry.import', 'inquiry.export',
  'customer.view', 'customer.create', 'customer.update', 'customer.import', 'customer.export',
  'product.view', 'product.export',
  'reminder.view', 'reminder.create', 'reminder.update', 'reminder.complete', 'reminder.export',
  'followup.view', 'followup.create', 'followup.update', 'followup.export'
)
WHERE r.name = 'Sales Executive'
ON CONFLICT DO NOTHING;

-- Read-only Auditor
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'dashboard.view',
  'inquiry.view',
  'customer.view',
  'product.view',
  'reminder.view',
  'followup.view',
  'role.view',
  'user.view',
  'activity.view'
)
WHERE r.name = 'Read-only Auditor'
ON CONFLICT DO NOTHING;
