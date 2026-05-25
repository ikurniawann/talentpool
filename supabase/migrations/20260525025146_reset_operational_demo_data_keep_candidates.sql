-- ============================================================
-- Reset operational/demo data before production trial
-- ============================================================
--
-- Purpose:
-- - Clear POS, CRM, Purchasing, Production, Inventory, AI Assistant, XP,
--   HRIS operational, payroll, staff, and notification demo data.
-- - Preserve recruitment/candidate data and the master data needed to keep
--   candidate records readable.
--
-- Explicitly preserved:
-- - candidates
-- - interviews
-- - candidate_activities
-- - candidate_notes
-- - activity_logs
-- - notifications_log
-- - brands
-- - positions
-- - departments
-- - job_openings
-- - users / auth.users
-- - settings
--
-- Notes:
-- - Uses DELETE instead of TRUNCATE CASCADE so preserved candidate tables are
--   not accidentally emptied by foreign-key cascade.
-- - Tables that do not exist in a given environment are skipped.
-- - Candidates promoted to employees will keep the candidate row; deleting
--   employees should clear promoted_to_employee_id through ON DELETE SET NULL.

DO $$
DECLARE
  v_table text;
  v_deleted bigint;
  v_tables text[] := ARRAY[
    -- AI Assistant conversations and audit
    'ai_assistant_logs',
    'ai_assistant_messages',
    'ai_assistant_sessions',

    -- POS transactional data
    'pos_print_jobs',
    'pos_order_split_items',
    'pos_order_splits',
    'pos_order_status_history',
    'pos_order_items',
    'pos_xp_transactions',
    'pos_wallet_transactions',
    'pos_orders',
    'pos_payments',
    'pos_reservations',
    'pos_shifts',

    -- CRM / membership transactional data
    'crm_external_events',
    'crm_redemptions',
    'crm_member_avatar_inventory',
    'crm_xp_ledger',
    'crm_member_profiles',

    -- POS / CRM master/demo configuration
    'pos_customers',
    'crm_rewards',
    'crm_collectible_avatars',
    'crm_xp_rules',
    'crm_integration_partners',
    'crm_membership_tiers',

    -- Production and stock output
    'production_order_materials',
    'production_batches',
    'production_orders',
    'finished_goods_inventory',

    -- Purchasing returns, QC, receiving, delivery
    'purchase_return_items',
    'purchase_returns',
    'returns',
    'qc_inspections',
    'goods_receipt_items',
    'goods_receipts',
    'grn_items',
    'grn',
    'gr_items',
    'delivery_items',
    'deliveries',

    -- Purchasing requests and orders
    'pr_items',
    'purchase_requests',
    'po_details',
    'po_items',
    'purchase_order_items',
    'purchase_orders',

    -- Inventory movement and on-hand stock
    'inventory_movements',
    'inventory',

    -- BOM / recipe / COGS
    'bom_items',
    'bom',
    'cogs_additional_costs',

    -- POS product data
    'pos_product_modifier_groups',
    'pos_product_modifiers',
    'pos_modifiers',
    'pos_modifier_groups',
    'pos_product_variants',
    'pos_variants',
    'pos_products',
    'pos_categories',
    'pos_tables',

    -- Purchasing master/demo data
    'supplier_price_list',
    'supplier_price_lists',
    'raw_materials',
    'bahan_baku',
    'products',
    'produk',
    'suppliers',
    'vendors',
    'units',
    'satuan',

    -- XP/gamification demo data
    'xp_redemptions',
    'xp_rewards',
    'user_challenge_progress',
    'xp_challenges',
    'user_badges',
    'xp_badges',
    'xp_activities',
    'user_xp_stats',

    -- App notifications
    'notifications',

    -- HRIS / staff operational data
    'feedback_responses',
    'feedback_summaries',
    'feedback_assignments',
    'feedback_criteria',
    'feedback_categories',
    'feedback_cycles',
    'behavioral_review_items',
    'behavioral_assessments',
    'development_plans',
    'kpi_progress_updates',
    'employee_kpis',
    'kpi_template_mappings',
    'kpi_template_behavioral',
    'kpi_template_items',
    'kpi_templates',
    'performance_reviews',
    'performance_categories',
    'score_scales',
    'employee_documents',
    'employment_history',
    'employee_benefits',
    'benefits',
    'employee_salary',
    'payroll_details',
    'payroll_runs',
    'payroll_settings',
    'payroll_tax_config',
    'leave_balances',
    'leaves',
    'attendance',
    'loans',
    'offboarding_checklists',
    'onboarding_checklists',
    'employee_schedules',
    'staff_schedules',
    'staff_sections',
    'staff',
    'project_assignments',
    'hris_logbook_entry_items',
    'hris_logbook_entries',
    'hris_logbook_template_items',
    'hris_logbook_templates',
    'employees',
    'employment_statuses',
    'sections'
  ];
BEGIN
  RAISE NOTICE 'Starting Arkiv OS operational/demo data reset. Candidate data is preserved.';

  FOREACH v_table IN ARRAY v_tables LOOP
    IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
      EXECUTE format('DELETE FROM public.%I', v_table);
      GET DIAGNOSTICS v_deleted = ROW_COUNT;
      RAISE NOTICE 'Deleted % rows from public.%', v_deleted, v_table;
    ELSE
      RAISE NOTICE 'Skipped missing table public.%', v_table;
    END IF;
  END LOOP;

  -- Reset owned sequences only for tables that were cleaned. UUID primary keys
  -- are unaffected, but this keeps legacy serial tables tidy.
  FOR v_table IN
    SELECT format('%I.%I', sequence_ns.nspname, sequence_class.relname)
    FROM pg_class sequence_class
    JOIN pg_namespace sequence_ns ON sequence_ns.oid = sequence_class.relnamespace
    JOIN pg_depend dependency ON dependency.objid = sequence_class.oid
    JOIN pg_class owned_table ON owned_table.oid = dependency.refobjid
    JOIN pg_namespace table_ns ON table_ns.oid = owned_table.relnamespace
    WHERE sequence_class.relkind = 'S'
      AND sequence_ns.nspname = 'public'
      AND table_ns.nspname = 'public'
      AND owned_table.relname = ANY(v_tables)
  LOOP
    EXECUTE format('ALTER SEQUENCE %s RESTART WITH 1', v_table);
  END LOOP;

  RAISE NOTICE 'Arkiv OS operational/demo data reset completed. Candidate data is preserved.';
END $$;
