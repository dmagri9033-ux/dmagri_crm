-- Hide rows created by Administrator from non-administrator users.
-- Administrators (role name) continue to see all rows.
-- Service-role / cron clients bypass RLS.

CREATE OR REPLACE FUNCTION public.is_administrator_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.roles r ON r.id = p.role_id
    WHERE p.id = p_user_id
      AND p.deleted_at IS NULL
      AND r.deleted_at IS NULL
      AND lower(trim(r.name)) = 'administrator'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_administrator()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_administrator_user(auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.created_by_visible(p_created_by uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_user_is_administrator()
    OR p_created_by IS NULL
    OR NOT public.is_administrator_user(p_created_by);
$$;

REVOKE ALL ON FUNCTION public.is_administrator_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_user_is_administrator() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.created_by_visible(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_administrator_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_administrator() TO authenticated;
GRANT EXECUTE ON FUNCTION public.created_by_visible(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.is_administrator_user(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_user_is_administrator() TO service_role;
GRANT EXECUTE ON FUNCTION public.created_by_visible(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customers_all_active ON public.customers;

CREATE POLICY customers_select_visible
  ON public.customers FOR SELECT TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY customers_insert_active
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile());

CREATE POLICY customers_update_visible
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by))
  WITH CHECK (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY customers_delete_visible
  ON public.customers FOR DELETE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

-- ---------------------------------------------------------------------------
-- inquiries
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS inquiries_all_active ON public.inquiries;

CREATE POLICY inquiries_select_visible
  ON public.inquiries FOR SELECT TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY inquiries_insert_active
  ON public.inquiries FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile());

CREATE POLICY inquiries_update_visible
  ON public.inquiries FOR UPDATE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by))
  WITH CHECK (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY inquiries_delete_visible
  ON public.inquiries FOR DELETE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

-- ---------------------------------------------------------------------------
-- followups
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS followups_all_active ON public.followups;

CREATE POLICY followups_select_visible
  ON public.followups FOR SELECT TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY followups_insert_active
  ON public.followups FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile());

CREATE POLICY followups_update_visible
  ON public.followups FOR UPDATE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by))
  WITH CHECK (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY followups_delete_visible
  ON public.followups FOR DELETE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

-- ---------------------------------------------------------------------------
-- reminders
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS reminders_all_active ON public.reminders;

CREATE POLICY reminders_select_visible
  ON public.reminders FOR SELECT TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY reminders_insert_active
  ON public.reminders FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile());

CREATE POLICY reminders_update_visible
  ON public.reminders FOR UPDATE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by))
  WITH CHECK (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY reminders_delete_visible
  ON public.reminders FOR DELETE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

-- ---------------------------------------------------------------------------
-- customer_notes
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS customer_notes_all_active ON public.customer_notes;

CREATE POLICY customer_notes_select_visible
  ON public.customer_notes FOR SELECT TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY customer_notes_insert_active
  ON public.customer_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile());

CREATE POLICY customer_notes_update_visible
  ON public.customer_notes FOR UPDATE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by))
  WITH CHECK (public.is_active_profile() AND public.created_by_visible(created_by));

CREATE POLICY customer_notes_delete_visible
  ON public.customer_notes FOR DELETE TO authenticated
  USING (public.is_active_profile() AND public.created_by_visible(created_by));

-- ---------------------------------------------------------------------------
-- activity_logs (actor_id = creator)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS activity_logs_select_global ON public.activity_logs;
DROP POLICY IF EXISTS activity_logs_select_customer_scoped ON public.activity_logs;

CREATE POLICY activity_logs_select_global
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    public.is_active_profile()
    AND public.app_has_permission('activity.view')
    AND public.created_by_visible(actor_id)
  );

CREATE POLICY activity_logs_select_customer_scoped
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    public.is_active_profile()
    AND customer_id IS NOT NULL
    AND public.app_has_permission('customer.view')
    AND public.created_by_visible(actor_id)
  );

CREATE INDEX IF NOT EXISTS customers_created_by_idx ON public.customers (created_by);
CREATE INDEX IF NOT EXISTS inquiries_created_by_idx ON public.inquiries (created_by);
CREATE INDEX IF NOT EXISTS reminders_created_by_idx ON public.reminders (created_by);
CREATE INDEX IF NOT EXISTS customer_notes_created_by_idx ON public.customer_notes (created_by);
