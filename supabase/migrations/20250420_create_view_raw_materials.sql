-- ============================================
-- FIX: Create v_raw_materials_stock view
-- ============================================

-- Ensure function exists first
CREATE OR REPLACE FUNCTION get_stock_status(
    p_onhand DECIMAL,
    p_minimum DECIMAL
) RETURNS TEXT AS $$
BEGIN
    IF p_onhand <= 0 THEN
        RETURN 'HABIS';
    ELSIF p_onhand <= p_minimum THEN
        RETURN 'MENIPIS';
    ELSE
        RETURN 'AMAN';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create view: Raw Materials dengan info stok
CREATE OR REPLACE VIEW v_raw_materials_stock AS
SELECT 
    rm.*,
    u1.nama as satuan_besar_nama,
    u2.nama as satuan_kecil_nama,
    COALESCE(i.qty_onhand, 0) as qty_onhand,
    COALESCE(i.qty_reserved, 0) as qty_reserved,
    COALESCE(i.qty_on_order, 0) as qty_on_order,
    COALESCE(i.avg_cost, 0) as avg_cost,
    get_stock_status(COALESCE(i.qty_onhand, 0), rm.stok_minimum) as status_stok
FROM raw_materials rm
LEFT JOIN units u1 ON rm.satuan_besar_id = u1.id
LEFT JOIN units u2 ON rm.satuan_kecil_id = u2.id
LEFT JOIN inventory i ON rm.id = i.raw_material_id
WHERE rm.deleted_at IS NULL AND rm.is_active = TRUE;

-- Add comment for clarity
COMMENT ON VIEW v_raw_materials_stock IS 'View untuk menampilkan bahan baku dengan informasi stok real-time';
