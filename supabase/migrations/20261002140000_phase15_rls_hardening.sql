-- Phase 15: tighten RLS for sensitive tables while keeping app-layer RBAC primary.
-- Cron / service-role clients bypass RLS and are unaffected.

CREATE OR REPLACE FUNCTION public.app_has_permission(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    INNER JOIN public.role_permissions rp ON rp.role_id = p.role_id
    INNER JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE p.id = auth.uid()
      AND p.is_active = true
      AND p.deleted_at IS NULL
      AND perm.code = p_code
  );
$$;

REVOKE ALL ON FUNCTION public.app_has_permission(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.app_has_permission(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Roles / role_permissions: mutations require role.* permissions
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS roles_write_active ON public.roles;

CREATE POLICY roles_insert_permission
  ON public.roles FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile() AND public.app_has_permission('role.create'));

CREATE POLICY roles_update_permission
  ON public.roles FOR UPDATE TO authenticated
  USING (
    public.is_active_profile()
    AND (
      public.app_has_permission('role.update')
      OR public.app_has_permission('role.delete')
    )
  )
  WITH CHECK (
    public.is_active_profile()
    AND (
      public.app_has_permission('role.update')
      OR public.app_has_permission('role.delete')
    )
  );

DROP POLICY IF EXISTS role_permissions_write_active ON public.role_permissions;

CREATE POLICY role_permissions_insert_permission
  ON public.role_permissions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_profile()
    AND (
      public.app_has_permission('role.create')
      OR public.app_has_permission('role.update')
    )
  );

CREATE POLICY role_permissions_delete_permission
  ON public.role_permissions FOR DELETE TO authenticated
  USING (
    public.is_active_profile()
    AND (
      public.app_has_permission('role.create')
      OR public.app_has_permission('role.update')
      OR public.app_has_permission('role.delete')
    )
  );

-- ---------------------------------------------------------------------------
-- Notifications: authenticated users may only insert/update own rows.
-- Reminder cron inserts use the service-role client (bypasses RLS).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS notifications_insert_active ON public.notifications;

CREATE POLICY notifications_insert_own
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile() AND user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Activity logs: global select requires activity.view; customer-scoped
-- select allowed with customer.view (Customer 360 timeline).
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS activity_logs_select_active ON public.activity_logs;

CREATE POLICY activity_logs_select_global
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    public.is_active_profile()
    AND public.app_has_permission('activity.view')
  );

CREATE POLICY activity_logs_select_customer_scoped
  ON public.activity_logs FOR SELECT TO authenticated
  USING (
    public.is_active_profile()
    AND customer_id IS NOT NULL
    AND public.app_has_permission('customer.view')
  );

-- ---------------------------------------------------------------------------
-- Import staging: owner-scoped (created_by = auth.uid())
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS import_batches_all_active ON public.import_batches;
DROP POLICY IF EXISTS import_batch_rows_all_active ON public.import_batch_rows;

CREATE POLICY import_batches_select_own
  ON public.import_batches FOR SELECT TO authenticated
  USING (public.is_active_profile() AND created_by = auth.uid());

CREATE POLICY import_batches_insert_own
  ON public.import_batches FOR INSERT TO authenticated
  WITH CHECK (public.is_active_profile() AND created_by = auth.uid());

CREATE POLICY import_batches_update_own
  ON public.import_batches FOR UPDATE TO authenticated
  USING (public.is_active_profile() AND created_by = auth.uid())
  WITH CHECK (public.is_active_profile() AND created_by = auth.uid());

CREATE POLICY import_batch_rows_select_own
  ON public.import_batch_rows FOR SELECT TO authenticated
  USING (
    public.is_active_profile()
    AND EXISTS (
      SELECT 1
      FROM public.import_batches b
      WHERE b.id = import_batch_rows.batch_id
        AND b.created_by = auth.uid()
    )
  );

CREATE POLICY import_batch_rows_insert_own
  ON public.import_batch_rows FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_profile()
    AND EXISTS (
      SELECT 1
      FROM public.import_batches b
      WHERE b.id = import_batch_rows.batch_id
        AND b.created_by = auth.uid()
    )
  );

CREATE POLICY import_batch_rows_update_own
  ON public.import_batch_rows FOR UPDATE TO authenticated
  USING (
    public.is_active_profile()
    AND EXISTS (
      SELECT 1
      FROM public.import_batches b
      WHERE b.id = import_batch_rows.batch_id
        AND b.created_by = auth.uid()
    )
  )
  WITH CHECK (
    public.is_active_profile()
    AND EXISTS (
      SELECT 1
      FROM public.import_batches b
      WHERE b.id = import_batch_rows.batch_id
        AND b.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Profiles: creating profiles requires user.create (provisioning)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_insert_active ON public.profiles;

CREATE POLICY profiles_insert_permission
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_active_profile()
    AND public.app_has_permission('user.create')
  );
