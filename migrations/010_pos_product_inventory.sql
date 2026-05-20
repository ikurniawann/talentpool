-- ============================================================-- Migration 010: Add simple inventory columns to pos_products
-- ============================================================

-- 1. Add inventory columns for simple stock tracking
ALTER TABLE pos_products
  ADD COLUMN IF NOT EXISTS inventory_quantity decimal(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS inventory_min_stock decimal(12,2) DEFAULT 0;

-- 2. Index for low-stock queries
CREATE INDEX IF NOT EXISTS idx_pos_products_inventory ON pos_products(inventory_quantity, inventory_min_stock) WHERE inventory_tracking = true;

-- 3. Update pos_deduct_inventory to also deduct simple product inventory
CREATE OR REPLACE FUNCTION pos_deduct_inventory(
  p_product_id uuid,
  p_quantity decimal(10,2),
  p_order_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_recipe record;
  v_needed decimal(12,4);
  v_before decimal(12,4);
  v_has_recipe boolean := false;
BEGIN
  -- Deduct via recipe/BOM (existing behavior)
  FOR v_recipe IN
    SELECT raw_material_id, quantity_per_unit, unit_of_measure
    FROM pos_recipes
    WHERE product_id = p_product_id AND is_active = true
  LOOP
    v_has_recipe := true;
    v_needed := v_recipe.quantity_per_unit * p_quantity;

    SELECT current_stock INTO v_before
    FROM purchasing.raw_materials
    WHERE id = v_recipe.raw_material_id;

    UPDATE purchasing.raw_materials
    SET current_stock = COALESCE(current_stock, 0) - v_needed,
        updated_at = now()
    WHERE id = v_recipe.raw_material_id;
  END LOOP;

  -- If no recipe exists, deduct from simple product inventory
  IF NOT v_has_recipe THEN
    UPDATE pos_products
    SET inventory_quantity = COALESCE(inventory_quantity, 0) - p_quantity,
        updated_at = now()
    WHERE id = p_product_id;
  END IF;

  RETURN true;
END;
$$;

-- 4. Add validation for simple product inventory (no recipe) before checkout
-- This is handled in pos_create_order_transaction by checking inventory_tracking flag
-- and calling pos_deduct_inventory which now handles both recipe and simple stock.

-- 5. Optional: Add trigger to prevent negative inventory for simple tracked products
CREATE OR REPLACE FUNCTION pos_prevent_negative_inventory()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.inventory_tracking = true AND NEW.inventory_quantity IS NOT NULL AND NEW.inventory_quantity < 0 THEN
    NEW.inventory_quantity := 0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pos_products_prevent_negative ON pos_products;
CREATE TRIGGER trg_pos_products_prevent_negative
  BEFORE UPDATE ON pos_products
  FOR EACH ROW
  EXECUTE FUNCTION pos_prevent_negative_inventory();
