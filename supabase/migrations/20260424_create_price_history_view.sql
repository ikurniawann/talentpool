-- ============================================
-- MIGRATION: Supplier Price History Tracking
-- Created: 2026-04-24
-- Purpose: Track and visualize price changes over time
-- ============================================

-- View: Get all price history with supplier and material details
CREATE OR REPLACE VIEW v_supplier_price_history AS
SELECT 
    spl.id,
    spl.supplier_id,
    s.nama_supplier,
    s.kode as supplier_kode,
    spl.bahan_baku_id,
    bb.nama as bahan_baku_nama,
    bb.kode as bahan_baku_kode,
    bb.kategori,
    spl.harga,
    spl.satuan_id,
    u.nama as satuan_nama,
    spl.minimum_qty,
    spl.lead_time_days,
    spl.is_preferred,
    spl.berlaku_dari,
    spl.berlaku_sampai,
    spl.catatan,
    spl.is_active,
    spl.created_at,
    spl.updated_at,
    -- Calculate price change from previous record
    LAG(spl.harga) OVER (
        PARTITION BY spl.supplier_id, spl.bahan_baku_id 
        ORDER BY spl.berlaku_dari
    ) as previous_price,
    -- Calculate percentage change
    CASE 
        WHEN LAG(spl.harga) OVER (
            PARTITION BY spl.supplier_id, spl.bahan_baku_id 
            ORDER BY spl.berlaku_dari
        ) IS NULL THEN NULL
        ELSE ROUND(
            ((spl.harga - LAG(spl.harga) OVER (
                PARTITION BY spl.supplier_id, spl.bahan_baku_id 
                ORDER BY spl.berlaku_dari
            )) / LAG(spl.harga) OVER (
                PARTITION BY spl.supplier_id, spl.bahan_baku_id 
                ORDER BY spl.berlaku_dari
            )) * 100, 
            2
        )
    END as price_change_percent
FROM supplier_price_lists spl
LEFT JOIN suppliers s ON spl.supplier_id = s.id
LEFT JOIN bahan_baku bb ON spl.bahan_baku_id = bb.id
LEFT JOIN units u ON spl.satuan_id = u.id
WHERE spl.is_active = TRUE
ORDER BY spl.supplier_id, spl.bahan_baku_id, spl.berlaku_dari DESC;

-- View: Price statistics per supplier-material combination
CREATE OR REPLACE VIEW v_supplier_price_stats AS
SELECT 
    spl.supplier_id,
    s.nama_supplier,
    spl.bahan_baku_id,
    bb.nama as bahan_baku_nama,
    COUNT(*) as total_price_changes,
    MIN(spl.harga) as min_price,
    MAX(spl.harga) as max_price,
    AVG(spl.harga) as avg_price,
    CURRENT_PRICE.harga as current_price,
    FIRST_PRICE.harga as first_price,
    CASE 
        WHEN FIRST_PRICE.harga > 0 THEN 
            ROUND(((CURRENT_PRICE.harga - FIRST_PRICE.harga) / FIRST_PRICE.harga) * 100, 2)
        ELSE 0 
    END as total_price_change_percent,
    MIN(spl.berlaku_dari) as first_recorded_date,
    MAX(spl.berlaku_dari) as last_updated_date
FROM supplier_price_lists spl
LEFT JOIN suppliers s ON spl.supplier_id = s.id
LEFT JOIN bahan_baku bb ON spl.bahan_baku_id = bb.id
-- Get current price (latest active record)
LEFT JOIN LATERAL (
    SELECT harga FROM supplier_price_lists 
    WHERE supplier_id = spl.supplier_id 
    AND bahan_baku_id = spl.bahan_baku_id 
    AND is_active = TRUE
    ORDER BY berlaku_dari DESC 
    LIMIT 1
) as CURRENT_PRICE ON TRUE
-- Get first price (earliest record)
LEFT JOIN LATERAL (
    SELECT harga FROM supplier_price_lists 
    WHERE supplier_id = spl.supplier_id 
    AND bahan_baku_id = spl.bahan_baku_id 
    ORDER BY berlaku_dari ASC 
    LIMIT 1
) as FIRST_PRICE ON TRUE
WHERE spl.is_active = TRUE
GROUP BY 
    spl.supplier_id, s.nama_supplier, 
    spl.bahan_baku_id, bb.nama,
    CURRENT_PRICE.harga, FIRST_PRICE.harga
ORDER BY spl.supplier_id, spl.bahan_baku_id;

COMMENT ON VIEW v_supplier_price_history IS 'Histori perubahan harga supplier per bahan baku dengan kalkulasi perubahan';
COMMENT ON VIEW v_supplier_price_stats IS 'Statistik harga supplier: min, max, avg, total perubahan %';
