-- Allow PR draft edits to be saved or submitted to approval.

DROP POLICY IF EXISTS "Requester can update draft PRs" ON purchase_requests;

CREATE POLICY "Requester can update draft PRs"
  ON purchase_requests FOR UPDATE
  USING (
    (
      requester_id = auth.uid()
      AND status = 'draft'
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
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('purchasing_manager', 'purchasing_admin', 'super_admin', 'admin')
    )
  )
  WITH CHECK (
    (
      requester_id = auth.uid()
      AND status IN ('draft', 'pending_head')
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
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND role IN ('purchasing_manager', 'purchasing_admin', 'super_admin', 'admin')
    )
  );
