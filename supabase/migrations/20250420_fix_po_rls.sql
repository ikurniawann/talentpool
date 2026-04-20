-- ============================================
-- FIX: Enable RLS and create policies for purchase_orders
-- ============================================

-- Enable RLS
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON purchase_orders;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON purchase_orders;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON purchase_orders;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON purchase_orders;
DROP POLICY IF EXISTS "Allow delete for authenticated users" ON purchase_orders;

-- Create policy for all operations (untuk development/testing)
-- Nanti bisa diperketat sesuai role user
CREATE POLICY "Allow all operations for authenticated users" ON purchase_orders
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy untuk anon (jika diperlukan untuk public access)
-- CREATE POLICY "Allow select for anon users" ON purchase_orders
--     FOR SELECT
--     TO anon
--     USING (is_active = true);

-- ============================================
-- FIX: Enable RLS for purchase_order_items
-- ============================================

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON purchase_order_items;

CREATE POLICY "Allow all operations for authenticated users" ON purchase_order_items
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
