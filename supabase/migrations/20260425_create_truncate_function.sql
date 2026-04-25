-- ============================================================
-- Migration: Create Truncate All Data Function
-- Purpose: Allow truncating all purchasing data via RPC call
-- Usage: SELECT truncate_all_data();
-- ============================================================

-- Create the function
CREATE OR REPLACE FUNCTION truncate_all_data()
RETURNS void AS $$
BEGIN
  -- 1. Returns (most independent)
  TRUNCATE TABLE purchase_return_items CASCADE;
  TRUNCATE TABLE purchase_returns CASCADE;
  
  -- 2. Inventory
  TRUNCATE TABLE inventory_movements CASCADE;
  TRUNCATE TABLE inventory CASCADE;
  
  -- 3. QC
  TRUNCATE TABLE qc_inspections CASCADE;
  
  -- 4. GRN
  TRUNCATE TABLE grn_items CASCADE;
  TRUNCATE TABLE grn CASCADE;
  
  -- 5. Delivery
  TRUNCATE TABLE deliveries CASCADE;
  
  -- 6. Purchase Order
  TRUNCATE TABLE purchase_order_items CASCADE;
  TRUNCATE TABLE purchase_orders CASCADE;
  
  -- 7. Price List
  TRUNCATE TABLE supplier_price_lists CASCADE;
  
  -- 8. BOM
  TRUNCATE TABLE bom CASCADE;
  
  -- 9. Produk
  TRUNCATE TABLE produk CASCADE;
  
  -- 10. Bahan Baku
  TRUNCATE TABLE bahan_baku CASCADE;
  
  -- 11. Supplier
  TRUNCATE TABLE suppliers CASCADE;
  
  -- 12. Satuan (last - most independent)
  TRUNCATE TABLE satuan CASCADE;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION truncate_all_data() IS 'Truncate all purchasing data tables in correct dependency order';

-- Grant execute to authenticated users (optional - adjust based on your needs)
-- GRANT EXECUTE ON FUNCTION truncate_all_data() TO authenticated;
