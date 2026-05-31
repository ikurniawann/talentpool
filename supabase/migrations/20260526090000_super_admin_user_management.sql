-- Super Admin user management and approval permissions.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check CHECK (
    role IN (
      'super_admin',
      'admin',
      'hrd',
      'hiring_manager',
      'direksi',
      'purchasing_admin',
      'purchasing_manager',
      'purchasing_staff',
      'finance_staff',
      'warehouse_staff',
      'warehouse_admin',
      'pos',
      'pos_supervisor',
      'qc_staff'
    )
  );

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_status_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'inactive'));

UPDATE public.users u
SET email = au.email
FROM auth.users au
WHERE u.id = au.id
  AND u.email IS NULL;

CREATE TABLE IF NOT EXISTS public.user_approval_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  workflow TEXT NOT NULL,
  approval_level TEXT NOT NULL,
  approval_limit NUMERIC(14, 2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_approval_permissions_level_check CHECK (
    approval_level IN ('checker', 'approver', 'final_approver')
  ),
  CONSTRAINT user_approval_permissions_limit_check CHECK (
    approval_limit IS NULL OR approval_limit >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS user_approval_permissions_unique_active
  ON public.user_approval_permissions (user_id, module, workflow, approval_level)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS user_approval_permissions_user_idx
  ON public.user_approval_permissions (user_id);

CREATE INDEX IF NOT EXISTS user_approval_permissions_workflow_idx
  ON public.user_approval_permissions (module, workflow, is_active);

CREATE TABLE IF NOT EXISTS public.admin_user_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS admin_user_audit_logs_target_user_idx
  ON public.admin_user_audit_logs (target_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS admin_user_audit_logs_actor_idx
  ON public.admin_user_audit_logs (actor_id, created_at DESC);

ALTER TABLE public.user_approval_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_manage_user_approval_permissions"
  ON public.user_approval_permissions;
CREATE POLICY "service_role_manage_user_approval_permissions"
  ON public.user_approval_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "users_read_own_approval_permissions"
  ON public.user_approval_permissions;
CREATE POLICY "users_read_own_approval_permissions"
  ON public.user_approval_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service_role_manage_admin_user_audit_logs"
  ON public.admin_user_audit_logs;
CREATE POLICY "service_role_manage_admin_user_audit_logs"
  ON public.admin_user_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
