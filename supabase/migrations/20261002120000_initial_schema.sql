-- DM Agree CRM — initial schema
-- Phase 2: core tables, indexes, triggers, baseline RLS

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_mobile_digits(raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(regexp_replace(COALESCE(raw, ''), '\D', '', 'g'), '');
$$;

CREATE OR REPLACE FUNCTION public.customers_normalize_mobile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  digits text;
BEGIN
  digits := public.normalize_mobile_digits(NEW.mobile);
  IF digits IS NULL THEN
    RAISE EXCEPTION 'mobile number is required';
  END IF;

  -- India-friendly canonicalization (D2 recommendation):
  -- 10-digit local → prefix 91; 12-digit starting with 91 kept as-is.
  IF length(digits) = 10 THEN
    digits := '91' || digits;
  END IF;

  NEW.mobile_normalized := digits;
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- RBAC
-- ---------------------------------------------------------------------------

CREATE TABLE public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  module text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX permissions_module_idx ON public.permissions (module);

CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TRIGGER roles_set_updated_at
  BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles (id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX role_permissions_permission_id_idx
  ON public.role_permissions (permission_id);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text NOT NULL,
  email text NOT NULL UNIQUE,
  role_id uuid NOT NULL REFERENCES public.roles (id),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX profiles_role_id_idx ON public.profiles (role_id);
CREATE INDEX profiles_active_idx
  ON public.profiles (is_active)
  WHERE deleted_at IS NULL;

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Must be created AFTER public.profiles (SQL functions resolve relations at create time).
CREATE OR REPLACE FUNCTION public.is_active_profile()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.deleted_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_profile() TO service_role;

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX products_name_unique_active_idx
  ON public.products (lower(name))
  WHERE deleted_at IS NULL;

CREATE INDEX products_is_active_idx ON public.products (is_active);

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL,
  mobile_normalized text NOT NULL,
  customer_type text
    CHECK (
      customer_type IS NULL
      OR customer_type IN ('farmer', 'dealer', 'distributor', 'other')
    ),
  primary_product_id uuid REFERENCES public.products (id),
  product_purchased boolean NOT NULL DEFAULT false,
  follow_up_required boolean NOT NULL DEFAULT false,
  notes text,
  assigned_user_id uuid REFERENCES public.profiles (id),
  created_by uuid REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX customers_mobile_normalized_unique_active_idx
  ON public.customers (mobile_normalized)
  WHERE deleted_at IS NULL;

CREATE INDEX customers_name_trgm_idx
  ON public.customers USING gin (name gin_trgm_ops);

CREATE INDEX customers_primary_product_id_idx
  ON public.customers (primary_product_id);

CREATE INDEX customers_product_purchased_idx
  ON public.customers (product_purchased);

CREATE INDEX customers_follow_up_required_idx
  ON public.customers (follow_up_required);

CREATE INDEX customers_assigned_user_id_idx
  ON public.customers (assigned_user_id);

CREATE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER customers_normalize_mobile
  BEFORE INSERT OR UPDATE OF mobile ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.customers_normalize_mobile();

-- ---------------------------------------------------------------------------
-- Inquiries
-- ---------------------------------------------------------------------------

CREATE TABLE public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_date date NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers (id),
  customer_type text
    CHECK (
      customer_type IS NULL
      OR customer_type IN ('farmer', 'dealer', 'distributor', 'other')
    ),
  product_id uuid NOT NULL REFERENCES public.products (id),
  product_purchased boolean NOT NULL DEFAULT false,
  remarks text,
  assigned_user_id uuid REFERENCES public.profiles (id),
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  customer_name_snapshot text,
  mobile_snapshot text,
  product_name_snapshot text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX inquiries_inquiry_date_idx
  ON public.inquiries (inquiry_date DESC);

CREATE INDEX inquiries_customer_id_idx ON public.inquiries (customer_id);
CREATE INDEX inquiries_product_id_idx ON public.inquiries (product_id);
CREATE INDEX inquiries_product_purchased_idx
  ON public.inquiries (product_purchased);
CREATE INDEX inquiries_assigned_user_id_idx
  ON public.inquiries (assigned_user_id);
CREATE INDEX inquiries_date_customer_idx
  ON public.inquiries (inquiry_date, customer_id);

CREATE TRIGGER inquiries_set_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Follow-ups
-- ---------------------------------------------------------------------------

CREATE TABLE public.followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id),
  inquiry_id uuid REFERENCES public.inquiries (id),
  followup_date date NOT NULL,
  notes text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX followups_customer_date_idx
  ON public.followups (customer_id, followup_date DESC);

CREATE INDEX followups_inquiry_id_idx ON public.followups (inquiry_id);
CREATE INDEX followups_created_by_idx ON public.followups (created_by);
CREATE INDEX followups_followup_date_idx ON public.followups (followup_date);

CREATE TRIGGER followups_set_updated_at
  BEFORE UPDATE ON public.followups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------

CREATE TABLE public.reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers (id),
  inquiry_id uuid REFERENCES public.inquiries (id),
  remind_at timestamptz NOT NULL,
  notes text,
  assigned_user_id uuid NOT NULL REFERENCES public.profiles (id),
  completed_at timestamptz,
  snoozed_until timestamptz,
  cancelled_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX reminders_assigned_remind_at_idx
  ON public.reminders (assigned_user_id, remind_at);

CREATE INDEX reminders_customer_id_idx ON public.reminders (customer_id);

CREATE INDEX reminders_open_idx
  ON public.reminders (remind_at)
  WHERE completed_at IS NULL AND cancelled_at IS NULL AND deleted_at IS NULL;

CREATE TRIGGER reminders_set_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Purchases / notes
-- ---------------------------------------------------------------------------

CREATE TABLE public.customer_product_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id),
  product_id uuid NOT NULL REFERENCES public.products (id),
  inquiry_id uuid REFERENCES public.inquiries (id),
  purchased_at date,
  is_purchased boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX customer_product_purchases_customer_id_idx
  ON public.customer_product_purchases (customer_id);

CREATE UNIQUE INDEX customer_product_purchases_inquiry_unique_idx
  ON public.customer_product_purchases (customer_id, product_id, inquiry_id)
  WHERE inquiry_id IS NOT NULL;

CREATE TRIGGER customer_product_purchases_set_updated_at
  BEFORE UPDATE ON public.customer_product_purchases
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id),
  body text NOT NULL,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  deleted_at timestamptz
);

CREATE INDEX customer_notes_customer_id_idx
  ON public.customer_notes (customer_id, created_at DESC);

CREATE TRIGGER customer_notes_set_updated_at
  BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Notifications / activity / attachments
-- ---------------------------------------------------------------------------

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reminder_id uuid REFERENCES public.reminders (id) ON DELETE SET NULL,
  kind text NOT NULL
    CHECK (
      kind IN (
        'reminder_today',
        'reminder_overdue',
        'reminder_upcoming',
        'system'
      )
    ),
  title text NOT NULL,
  body text,
  dedupe_key text NOT NULL UNIQUE,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_read_idx
  ON public.notifications (user_id, read_at);

CREATE INDEX notifications_user_created_idx
  ON public.notifications (user_id, created_at DESC);

CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES public.profiles (id),
  action text NOT NULL,
  module text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers (id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_logs_customer_created_idx
  ON public.activity_logs (customer_id, created_at DESC);

CREATE INDEX activity_logs_entity_idx
  ON public.activity_logs (entity_type, entity_id);

CREATE INDEX activity_logs_actor_created_idx
  ON public.activity_logs (actor_id, created_at DESC);

CREATE INDEX activity_logs_module_created_idx
  ON public.activity_logs (module, created_at DESC);

CREATE TABLE public.attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  bucket text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  uploaded_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX attachments_entity_idx
  ON public.attachments (entity_type, entity_id)
  WHERE deleted_at IS NULL;

-- Optional Excel import audit tables
CREATE TABLE public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module text NOT NULL CHECK (module IN ('inquiries', 'customers')),
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'validated', 'committed', 'failed')),
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  error_rows integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.profiles (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  committed_at timestamptz,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE public.import_batch_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.import_batches (id) ON DELETE CASCADE,
  row_number integer NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_valid boolean NOT NULL DEFAULT false,
  errors jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_duplicate boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (batch_id, row_number)
);

CREATE INDEX import_batch_rows_batch_id_idx
  ON public.import_batch_rows (batch_id);

-- ---------------------------------------------------------------------------
-- Storage bucket (private attachments)
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-attachments',
  'crm-attachments',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Row Level Security (baseline)
-- ---------------------------------------------------------------------------

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_product_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batch_rows ENABLE ROW LEVEL SECURITY;

-- Active authenticated profile can read/write business data (app-layer RBAC is primary).
-- Permissions catalog is readable by active users; mutations of RBAC tables still app-gated.

CREATE POLICY permissions_select_active
  ON public.permissions FOR SELECT TO authenticated
  USING (public.is_active_profile());

CREATE POLICY roles_select_active
  ON public.roles FOR SELECT TO authenticated
  USING (public.is_active_profile());

CREATE POLICY roles_write_active
  ON public.roles FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY role_permissions_select_active
  ON public.role_permissions FOR SELECT TO authenticated
  USING (public.is_active_profile());

CREATE POLICY role_permissions_write_active
  ON public.role_permissions FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY profiles_select_active
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_active_profile() OR id = auth.uid());

CREATE POLICY profiles_update_self_or_active
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY profiles_insert_active
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile());

CREATE POLICY products_all_active
  ON public.products FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY customers_all_active
  ON public.customers FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY inquiries_all_active
  ON public.inquiries FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY followups_all_active
  ON public.followups FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY reminders_all_active
  ON public.reminders FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY customer_product_purchases_all_active
  ON public.customer_product_purchases FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY customer_notes_all_active
  ON public.customer_notes FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY notifications_select_own
  ON public.notifications FOR SELECT TO authenticated
  USING (public.is_active_profile() AND user_id = auth.uid());

CREATE POLICY notifications_update_own
  ON public.notifications FOR UPDATE TO authenticated
  USING (public.is_active_profile() AND user_id = auth.uid())
  WITH CHECK (public.is_active_profile() AND user_id = auth.uid());

CREATE POLICY notifications_insert_active
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile());

CREATE POLICY activity_logs_select_active
  ON public.activity_logs FOR SELECT TO authenticated
  USING (public.is_active_profile());

CREATE POLICY activity_logs_insert_active
  ON public.activity_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile() AND actor_id = auth.uid());

CREATE POLICY attachments_all_active
  ON public.attachments FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY import_batches_all_active
  ON public.import_batches FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

CREATE POLICY import_batch_rows_all_active
  ON public.import_batch_rows FOR ALL TO authenticated
  USING (public.is_active_profile())
  WITH CHECK (public.is_active_profile());

-- Storage policies for crm-attachments
CREATE POLICY crm_attachments_select
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'crm-attachments' AND public.is_active_profile());

CREATE POLICY crm_attachments_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'crm-attachments' AND public.is_active_profile());

CREATE POLICY crm_attachments_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'crm-attachments' AND public.is_active_profile())
  WITH CHECK (bucket_id = 'crm-attachments' AND public.is_active_profile());

CREATE POLICY crm_attachments_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'crm-attachments' AND public.is_active_profile());
