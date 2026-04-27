-- ============================================================
-- ARK POS - Phase 2: Seed Data & Helper Functions
-- ============================================================
-- Initial data for POS module
-- ============================================================

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. SEED CATEGORIES
-- ============================================================

INSERT INTO pos_categories (name, display_order, is_active) VALUES
  ('Makanan'     , 1, true),
  ('Minuman'     , 2, true),
  ('Snack'       , 3, true),
  ('Dessert'     , 4, true),
  ('Coffee'      , 5, true);

-- ============================================================
-- 2. SEED PRODUCTS (from mock data)
-- ============================================================

INSERT INTO pos_products (sku, name, category_id, base_price, cost_price, is_active, is_available, image_url)
SELECT 'NGS-001', 'Nasi Goreng Special', c.id, 50000, 25000, true, true, '/products/nasi-goreng.png'
FROM pos_categories c WHERE c.name = 'Makanan' LIMIT 1;

INSERT INTO pos_products (sku, name, category_id, base_price, cost_price, is_active, is_available, image_url)
SELECT 'ABM-002', 'Ayam Bakar Madu', c.id, 55000, 28000, true, true, '/products/ayam-bakar.png'
FROM pos_categories c WHERE c.name = 'Makanan' LIMIT 1;

INSERT INTO pos_products (sku, name, category_id, base_price, cost_price, is_active, is_available, image_url)
SELECT 'MGJ-003', 'Mie Goreng Jawa', c.id, 45000, 22000, true, true, '/products/mie-goreng.png'
FROM pos_categories c WHERE c.name = 'Makanan' LIMIT 1;

INSERT INTO pos_products (sku, name, category_id, base_price, cost_price, is_active, is_available, image_url)
SELECT 'ETM-004', 'Es Teh Manis', c.id, 5000, 2000, true, true, '/products/es-teh.png'
FROM pos_categories c WHERE c.name = 'Minuman' LIMIT 1;

INSERT INTO pos_products (sku, name, category_id, base_price, cost_price, is_active, is_available, image_url)
SELECT 'KSG-005', 'Kopi Susu Gula Aren', c.id, 18000, 8000, true, true, '/products/kopi-susu.png'
FROM pos_categories c WHERE c.name = 'Coffee' LIMIT 1;

INSERT INTO pos_products (sku, name, category_id, base_price, cost_price, is_active, is_available, image_url)
SELECT 'JAA-006', 'Jus Alpukat', c.id, 20000, 9000, true, true, '/products/jus-alpukat.png'
FROM pos_categories c WHERE c.name = 'Minuman' LIMIT 1;

INSERT INTO pos_products (sku, name, category_id, base_price, cost_price, is_active, is_available, image_url)
SELECT 'KGH-007', 'Kentang Goreng', c.id, 25000, 12000, true, true, '/products/kentang-goreng.png'
FROM pos_categories c WHERE c.name = 'Snack' LIMIT 1;

INSERT INTO pos_products (sku, name, category_id, base_price, cost_price, is_active, is_available, image_url)
SELECT 'RBC-008', 'Roti Bakar Coklat', c.id, 22000, 10000, true, true, '/products/roti-bakar.png'
FROM pos_categories c WHERE c.name = 'Dessert' LIMIT 1;

-- ============================================================
-- 3. SEED PRODUCT VARIANTS
-- ============================================================

INSERT INTO pos_product_variants (product_id, name, group_name, price_adjustment, display_order)
SELECT p.id, 'Small', 'Size', -10000, 1 FROM pos_products p WHERE p.sku = 'NGS-001' LIMIT 1;

INSERT INTO pos_product_variants (product_id, name, group_name, price_adjustment, display_order)
SELECT p.id, 'Medium', 'Size', 0, 2 FROM pos_products p WHERE p.sku = 'NGS-001' LIMIT 1;

INSERT INTO pos_product_variants (product_id, name, group_name, price_adjustment, display_order)
SELECT p.id, 'Large', 'Size', 15000, 3 FROM pos_products p WHERE p.sku = 'NGS-001' LIMIT 1;

INSERT INTO pos_product_variants (product_id, name, group_name, price_adjustment, display_order)
SELECT p.id, 'Paha', 'Potongan', 0, 1 FROM pos_products p WHERE p.sku = 'ABM-002' LIMIT 1;

INSERT INTO pos_product_variants (product_id, name, group_name, price_adjustment, display_order)
SELECT p.id, 'Dada', 'Potongan', 5000, 2 FROM pos_products p WHERE p.sku = 'ABM-002' LIMIT 1;

INSERT INTO pos_product_variants (product_id, name, group_name, price_adjustment, display_order)
SELECT p.id, 'Sayap', 'Potongan', -5000, 3 FROM pos_products p WHERE p.sku = 'ABM-002' LIMIT 1;

-- ============================================================
-- 4. SEED MODIFIER GROUPS & MODIFIERS
-- ============================================================

-- Sugar Level modifier group
INSERT INTO pos_modifier_groups (name, min_selection, max_selection, display_order) VALUES
  ('Sugar Level', 1, 1, 1),
  ('Toppings', 0, 3, 2),
  ('Spice Level', 1, 1, 3);

-- Modifiers
INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'No Sugar', 0, 1 FROM pos_modifier_groups mg WHERE mg.name = 'Sugar Level' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Less Sugar (25%)', 0, 2 FROM pos_modifier_groups mg WHERE mg.name = 'Sugar Level' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Half Sweet (50%)', 0, 3 FROM pos_modifier_groups mg WHERE mg.name = 'Sugar Level' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Full Sweet (100%)', 0, 4 FROM pos_modifier_groups mg WHERE mg.name = 'Sugar Level' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Extra Egg', 5000, 1 FROM pos_modifier_groups mg WHERE mg.name = 'Toppings' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Extra Chicken', 10000, 2 FROM pos_modifier_groups mg WHERE mg.name = 'Toppings' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Extra Rice', 5000, 3 FROM pos_modifier_groups mg WHERE mg.name = 'Toppings' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'No Spice', 0, 1 FROM pos_modifier_groups mg WHERE mg.name = 'Spice Level' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Less Spice', 0, 2 FROM pos_modifier_groups mg WHERE mg.name = 'Spice Level' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Normal Spice', 0, 3 FROM pos_modifier_groups mg WHERE mg.name = 'Spice Level' LIMIT 1;

INSERT INTO pos_modifiers (group_id, name, price_adjustment, display_order)
SELECT mg.id, 'Extra Spice', 0, 4 FROM pos_modifier_groups mg WHERE mg.name = 'Spice Level' LIMIT 1;

-- Link products to modifier groups
INSERT INTO pos_product_modifiers (product_id, modifier_group_id)
SELECT p.id, mg.id FROM pos_products p, pos_modifier_groups mg 
WHERE p.sku = 'NGS-001' AND mg.name = 'Sugar Level';

INSERT INTO pos_product_modifiers (product_id, modifier_group_id)
SELECT p.id, mg.id FROM pos_products p, pos_modifier_groups mg 
WHERE p.sku = 'NGS-001' AND mg.name = 'Toppings';

INSERT INTO pos_product_modifiers (product_id, modifier_group_id)
SELECT p.id, mg.id FROM pos_products p, pos_modifier_groups mg 
WHERE p.sku = 'MGJ-003' AND mg.name = 'Spice Level';

INSERT INTO pos_product_modifiers (product_id, modifier_group_id)
SELECT p.id, mg.id FROM pos_products p, pos_modifier_groups mg 
WHERE p.sku = 'ETM-004' AND mg.name = 'Sugar Level';

INSERT INTO pos_product_modifiers (product_id, modifier_group_id)
SELECT p.id, mg.id FROM pos_products p, pos_modifier_groups mg 
WHERE p.sku = 'KSG-005' AND mg.name = 'Sugar Level';

-- ============================================================
-- 5. SEED CUSTOMERS (from mock data)
-- ============================================================

INSERT INTO pos_customers (phone, name, membership_tier, ark_coin_balance, total_spent, visit_count) VALUES
  ('081234567890', 'Ahmad Wijaya', 'silver', 250000, 500000, 5),
  ('081234567891', 'Siti Rahayu', 'bronze', 85000, 150000, 2),
  ('081234567892', 'Budi Santoso', 'gold', 1500000, 3000000, 15),
  ('081234567893', 'Warung Kopi Nusantara', 'platinum', 5000000, 10000000, 50),
  ('081234567894', 'H. Abdullah Trading', 'platinum', 8500000, 20000000, 100);

-- ============================================================
-- 6. SEED TABLES
-- ============================================================

INSERT INTO pos_tables (table_number, capacity, status, is_active) VALUES
  ('Meja 1', 4, 'available', true),
  ('Meja 2', 4, 'available', true),
  ('Meja 3', 6, 'available', true),
  ('Meja 4', 6, 'available', true),
  ('Meja 5', 8, 'available', true),
  ('Meja 6', 2, 'available', true),
  ('Meja 7', 2, 'available', true),
  ('Meja 8', 10, 'available', true);

-- ============================================================
-- 7. SEED KDS STATIONS
-- ============================================================

INSERT INTO pos_kds_stations (name, display_order) VALUES
  ('Kitchen', 1),
  ('Bar', 2),
  ('Dessert', 3);

-- ============================================================
-- 8. VOUCHERS (Sample)
-- ============================================================

INSERT INTO pos_vouchers (code, type, value, min_purchase, valid_from, valid_to, usage_limit) VALUES
  ('WELCOME10', 'percentage', 10, 50000, NOW(), NOW() + INTERVAL '30 days', 100),
  ('DISCOUNT20K', 'fixed', 20000, 100000, NOW(), NOW() + INTERVAL '14 days', 50);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

SELECT 'Categories' as table_name, COUNT(*) as count FROM pos_categories
UNION ALL
SELECT 'Products', COUNT(*) FROM pos_products
UNION ALL
SELECT 'Variants', COUNT(*) FROM pos_product_variants
UNION ALL
SELECT 'Modifiers', COUNT(*) FROM pos_modifiers
UNION ALL
SELECT 'Customers', COUNT(*) FROM pos_customers
UNION ALL
SELECT 'Tables', COUNT(*) FROM pos_tables;
