-- ============================================================
-- Canonical PR -> PO flow cleanup
-- ============================================================

-- 1. Normalize active PO statuses to lowercase so DB, API, UI, and GRN agree.
ALTER TABLE purchase_orders
  ALTER COLUMN status SET DEFAULT 'draft';

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'purchase_orders'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.purchase_orders DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

UPDATE purchase_orders
SET status = CASE UPPER(status)
  WHEN 'DRAFT' THEN 'draft'
  WHEN 'APPROVED' THEN 'approved'
  WHEN 'SENT' THEN 'sent'
  WHEN 'PARTIAL' THEN 'partially_received'
  WHEN 'RECEIVED' THEN 'received'
  WHEN 'CANCELLED' THEN 'cancelled'
  ELSE LOWER(status)
END
WHERE status IS NOT NULL;

ALTER TABLE purchase_orders
  ADD CONSTRAINT purchase_orders_status_check
  CHECK (status IN ('draft', 'approved', 'sent', 'partially_received', 'received', 'cancelled'));

-- 2. Add traceability columns between PR and the active PO tables.
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS pr_id UUID;

ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS pr_item_id UUID;

ALTER TABLE pr_items
  ADD COLUMN IF NOT EXISTS raw_material_id UUID,
  ADD COLUMN IF NOT EXISTS satuan_id UUID;

-- 3. Add foreign keys safely. NOT VALID avoids blocking old dirty data.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_orders_pr_id_fkey'
  ) THEN
    ALTER TABLE purchase_orders
      ADD CONSTRAINT purchase_orders_pr_id_fkey
      FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_order_items_pr_item_id_fkey'
  ) THEN
    ALTER TABLE purchase_order_items
      ADD CONSTRAINT purchase_order_items_pr_item_id_fkey
      FOREIGN KEY (pr_item_id) REFERENCES pr_items(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pr_items_pr_id_fkey'
  ) THEN
    ALTER TABLE pr_items
      ADD CONSTRAINT pr_items_pr_id_fkey
      FOREIGN KEY (pr_id) REFERENCES purchase_requests(id) ON DELETE CASCADE NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pr_items_raw_material_id_fkey'
  ) THEN
    ALTER TABLE pr_items
      ADD CONSTRAINT pr_items_raw_material_id_fkey
      FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id) ON DELETE RESTRICT NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'pr_items_satuan_id_fkey'
  ) THEN
    ALTER TABLE pr_items
      ADD CONSTRAINT pr_items_satuan_id_fkey
      FOREIGN KEY (satuan_id) REFERENCES units(id) ON DELETE SET NULL NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_requests_converted_po_id_fkey'
  ) THEN
    ALTER TABLE purchase_requests
      ADD CONSTRAINT purchase_requests_converted_po_id_fkey
      FOREIGN KEY (converted_po_id) REFERENCES purchase_orders(id) ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

-- One PR should produce one canonical PO in this flow.
CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_pr_id_unique
  ON purchase_orders(pr_id)
  WHERE pr_id IS NOT NULL AND is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_pr_item_id
  ON purchase_order_items(pr_item_id);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_converted_po_id
  ON purchase_requests(converted_po_id);

CREATE INDEX IF NOT EXISTS idx_pr_items_raw_material_id
  ON pr_items(raw_material_id);

CREATE INDEX IF NOT EXISTS idx_pr_items_satuan_id
  ON pr_items(satuan_id);

CREATE INDEX IF NOT EXISTS idx_grn_items_purchase_order_item_id
  ON grn_items(purchase_order_item_id);

-- 4. Align PR RLS with the purchasing roles that need to convert approved PRs.
DROP POLICY IF EXISTS "Users can view PRs from their dept or all if admin" ON purchase_requests;
CREATE POLICY "Users can view PRs from their dept or all if admin"
  ON purchase_requests FOR SELECT
  USING (
    requester_id = auth.uid() OR
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
          'direksi',
          'finance_staff'
        )
    )
  );

DROP POLICY IF EXISTS "Users can view PR items they have access to" ON pr_items;
CREATE POLICY "Users can view PR items they have access to"
  ON pr_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_requests pr
      WHERE pr.id = pr_items.pr_id
        AND (
          pr.requester_id = auth.uid() OR
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
                'direksi',
                'finance_staff'
              )
          )
        )
    )
  );

-- 5. Recreate view with canonical status and PR reference.
DROP VIEW IF EXISTS v_purchase_orders;

CREATE OR REPLACE VIEW v_purchase_orders AS
SELECT
    po.*,
    pr.pr_number,
    s.nama_supplier,
    s.kode as supplier_kode,
    s.pic_name as supplier_pic,
    s.email as supplier_email,
    COALESCE(item_stats.total_items, 0) as total_items,
    COALESCE(item_stats.total_items, 0) as item_count,
    COALESCE(item_stats.total_qty, 0) as total_qty,
    COALESCE(item_stats.total_qty, 0) as total_qty_ordered,
    COALESCE(item_stats.received_qty, 0) as total_qty_received,
    COALESCE(item_stats.total_value, 0) as total_value,
    COALESCE(NULLIF(po.total, 0), item_stats.grand_total, 0) as grand_total,
    COALESCE(item_stats.received_items, 0) as received_items,
    CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100)
    END as progress_pct,
    CASE
        WHEN COALESCE(item_stats.total_qty, 0) = 0 THEN 0
        ELSE ROUND((COALESCE(item_stats.received_qty, 0)::numeric / item_stats.total_qty::numeric) * 100)
    END as receive_percentage
FROM purchase_orders po
LEFT JOIN purchase_requests pr ON pr.id = po.pr_id
LEFT JOIN suppliers s ON s.id = po.supplier_id
LEFT JOIN (
    SELECT
        purchase_order_id,
        COUNT(*) as total_items,
        COALESCE(SUM(qty_ordered), 0) as total_qty,
        COALESCE(SUM(subtotal), 0) as total_value,
        COALESCE(SUM((qty_ordered * harga_satuan) - COALESCE(diskon_item, 0)), 0) as grand_total,
        COALESCE(SUM(CASE WHEN qty_received >= qty_ordered THEN 1 ELSE 0 END), 0) as received_items,
        COALESCE(SUM(qty_received), 0) as received_qty
    FROM purchase_order_items
    WHERE is_active = true
    GROUP BY purchase_order_id
) item_stats ON item_stats.purchase_order_id = po.id
WHERE po.is_active = true;

COMMENT ON VIEW v_purchase_orders IS 'Canonical purchase orders with PR traceability and received quantity progress';

-- 6. Keep existing receive helper aligned with lowercase status.
CREATE OR REPLACE FUNCTION update_po_status_on_receive()
RETURNS TRIGGER AS $$
DECLARE
    total_ordered DECIMAL(12,4);
    total_received DECIMAL(12,4);
    po_status VARCHAR(20);
BEGIN
    SELECT status INTO po_status
    FROM purchase_orders
    WHERE id = NEW.purchase_order_id;

    IF po_status = 'cancelled' THEN
        RETURN NEW;
    END IF;

    SELECT COALESCE(SUM(qty_ordered), 0), COALESCE(SUM(qty_received), 0)
    INTO total_ordered, total_received
    FROM purchase_order_items
    WHERE purchase_order_id = NEW.purchase_order_id AND is_active = TRUE;

    IF total_received >= total_ordered THEN
        UPDATE purchase_orders
        SET status = 'received',
            updated_at = NOW()
        WHERE id = NEW.purchase_order_id;
    ELSIF total_received > 0 THEN
        UPDATE purchase_orders
        SET status = 'partially_received',
            updated_at = NOW()
        WHERE id = NEW.purchase_order_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Atomic conversion from approved PR to PO.
CREATE OR REPLACE FUNCTION convert_purchase_request_to_po(
  p_pr_id UUID,
  p_supplier_id UUID,
  p_tanggal_po DATE DEFAULT CURRENT_DATE,
  p_tanggal_kirim_estimasi DATE DEFAULT NULL,
  p_catatan TEXT DEFAULT NULL,
  p_alamat_pengiriman TEXT DEFAULT NULL,
  p_diskon_persen NUMERIC DEFAULT 0,
  p_diskon_nominal NUMERIC DEFAULT 0,
  p_ppn_persen NUMERIC DEFAULT 11,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  pr_record purchase_requests%ROWTYPE;
  new_po_id UUID;
  po_number TEXT;
  year_month TEXT;
  sequence_num INTEGER;
  subtotal_value NUMERIC(15,2);
  discount_value NUMERIC(15,2);
  tax_value NUMERIC(15,2);
  total_value NUMERIC(15,2);
BEGIN
  SELECT *
  INTO pr_record
  FROM purchase_requests
  WHERE id = p_pr_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PR tidak ditemukan';
  END IF;

  IF pr_record.status <> 'approved' THEN
    RAISE EXCEPTION 'Hanya PR approved yang bisa dibuatkan PO';
  END IF;

  IF pr_record.converted_po_id IS NOT NULL THEN
    RAISE EXCEPTION 'PR sudah pernah dibuatkan PO';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pr_items
    WHERE pr_id = p_pr_id
      AND raw_material_id IS NULL
  ) THEN
    RAISE EXCEPTION 'Semua item PR harus memiliki raw material sebelum dibuatkan PO';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pr_items
    WHERE pr_id = p_pr_id
  ) THEN
    RAISE EXCEPTION 'PR tidak memiliki item';
  END IF;

  year_month := 'PO-' || TO_CHAR(NOW(), 'YYYYMM') || '-';

  SELECT COALESCE(MAX(CAST(SUBSTRING(nomor_po FROM LENGTH(year_month) + 1) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM purchase_orders
  WHERE nomor_po LIKE year_month || '%';

  po_number := year_month || LPAD(sequence_num::TEXT, 4, '0');

  INSERT INTO purchase_orders (
    nomor_po,
    pr_id,
    supplier_id,
    tanggal_po,
    tanggal_kirim_estimasi,
    status,
    catatan,
    alamat_pengiriman,
    diskon_persen,
    diskon_nominal,
    ppn_persen,
    created_by,
    updated_by,
    is_active
  )
  VALUES (
    po_number,
    p_pr_id,
    p_supplier_id,
    COALESCE(p_tanggal_po, CURRENT_DATE),
    p_tanggal_kirim_estimasi,
    'draft',
    p_catatan,
    p_alamat_pengiriman,
    COALESCE(p_diskon_persen, 0),
    COALESCE(p_diskon_nominal, 0),
    COALESCE(p_ppn_persen, 11),
    p_created_by,
    p_created_by,
    TRUE
  )
  RETURNING id INTO new_po_id;

  INSERT INTO purchase_order_items (
    purchase_order_id,
    pr_item_id,
    raw_material_id,
    qty_ordered,
    satuan_id,
    harga_satuan,
    diskon_item,
    catatan,
    is_active
  )
  SELECT
    new_po_id,
    pi.id,
    pi.raw_material_id,
    pi.qty,
    pi.satuan_id,
    pi.estimated_price,
    0,
    pi.description,
    TRUE
  FROM pr_items pi
  WHERE pi.pr_id = p_pr_id;

  SELECT COALESCE(SUM((qty_ordered * harga_satuan) - COALESCE(diskon_item, 0)), 0)
  INTO subtotal_value
  FROM purchase_order_items
  WHERE purchase_order_id = new_po_id
    AND is_active = TRUE;

  IF COALESCE(p_diskon_persen, 0) > 0 THEN
    discount_value := subtotal_value * COALESCE(p_diskon_persen, 0) / 100;
  ELSE
    discount_value := COALESCE(p_diskon_nominal, 0);
  END IF;

  discount_value := LEAST(discount_value, subtotal_value);
  tax_value := (subtotal_value - discount_value) * COALESCE(p_ppn_persen, 11) / 100;
  total_value := subtotal_value - discount_value + tax_value;

  UPDATE purchase_orders
  SET subtotal = subtotal_value,
      diskon_nominal = discount_value,
      ppn_nominal = tax_value,
      total = total_value,
      updated_at = NOW()
  WHERE id = new_po_id;

  UPDATE purchase_requests
  SET status = 'converted',
      converted_po_id = new_po_id,
      updated_at = NOW()
  WHERE id = p_pr_id;

  RETURN new_po_id;
END;
$$ LANGUAGE plpgsql;
