-- Excel export permissions for remaining list modules.
INSERT INTO public.permissions (code, module, description) VALUES
  ('product.export', 'products', 'Excel export products'),
  ('reminder.export', 'reminders', 'Excel export reminders'),
  ('followup.export', 'followups', 'Excel export follow-ups'),
  ('user.export', 'users', 'Excel export users'),
  ('activity.export', 'activity', 'Excel export activity logs')
ON CONFLICT (code) DO UPDATE
SET
  module = EXCLUDED.module,
  description = EXCLUDED.description;

-- Grant new export permissions on existing databases.
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'product.export',
  'reminder.export',
  'followup.export',
  'user.export',
  'activity.export'
)
WHERE r.name = 'Administrator'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'product.export',
  'reminder.export',
  'followup.export'
)
WHERE r.name = 'Sales Executive'
ON CONFLICT DO NOTHING;
