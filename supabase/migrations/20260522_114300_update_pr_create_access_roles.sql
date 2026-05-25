-- Allow purchasing admin/super admin/POS supervisor users to create PRs from UI.

DROP POLICY IF EXISTS "Users can create their own PRs" ON purchase_requests;
CREATE POLICY "Users can create their own PRs"
  ON purchase_requests FOR INSERT
  WITH CHECK (
    requester_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN (
          'hrd',
          'purchasing_staff',
          'purchasing_manager',
          'purchasing_admin',
          'super_admin',
          'admin',
          'pos_supervisor'
        )
    )
  );

DROP POLICY IF EXISTS "Users can insert PR items for their PRs" ON pr_items;
CREATE POLICY "Users can insert PR items for their PRs"
  ON pr_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_requests pr
      WHERE pr.id = pr_items.pr_id
        AND pr.requester_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid()
            AND role IN (
              'hrd',
              'purchasing_staff',
              'purchasing_manager',
              'purchasing_admin',
              'super_admin',
              'admin',
              'pos_supervisor'
            )
        )
    )
  );
