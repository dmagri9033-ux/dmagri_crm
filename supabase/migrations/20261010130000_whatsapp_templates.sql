-- WhatsApp message templates (name, optional image, body text).
CREATE TABLE public.whatsapp_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  image_storage_path text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT whatsapp_templates_name_len CHECK (char_length(name) >= 2),
  CONSTRAINT whatsapp_templates_content_len CHECK (char_length(content) >= 1)
);

CREATE UNIQUE INDEX whatsapp_templates_name_active_uidx
  ON public.whatsapp_templates (lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX whatsapp_templates_active_idx
  ON public.whatsapp_templates (is_active, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER whatsapp_templates_set_updated_at
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY whatsapp_templates_all_active
  ON public.whatsapp_templates FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'whatsapp-templates',
  'whatsapp-templates',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY whatsapp_templates_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'whatsapp-templates' AND public.is_active_profile());

CREATE POLICY whatsapp_templates_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'whatsapp-templates' AND public.is_active_profile());

CREATE POLICY whatsapp_templates_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'whatsapp-templates' AND public.is_active_profile())
  WITH CHECK (bucket_id = 'whatsapp-templates' AND public.is_active_profile());

CREATE POLICY whatsapp_templates_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'whatsapp-templates' AND public.is_active_profile());

INSERT INTO public.permissions (code, module, description) VALUES
  ('template.view', 'templates', 'View WhatsApp message templates'),
  ('template.create', 'templates', 'Create WhatsApp message templates'),
  ('template.update', 'templates', 'Update WhatsApp message templates'),
  ('template.delete', 'templates', 'Delete WhatsApp message templates')
ON CONFLICT (code) DO UPDATE
SET module = EXCLUDED.module, description = EXCLUDED.description;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'template.view',
  'template.create',
  'template.update',
  'template.delete'
)
WHERE r.name = 'Administrator'
ON CONFLICT DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r
JOIN public.permissions p ON p.code IN (
  'template.view',
  'template.create',
  'template.update'
)
WHERE r.name = 'Sales Executive'
ON CONFLICT DO NOTHING;
