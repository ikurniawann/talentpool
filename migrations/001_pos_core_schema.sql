-- ============================================================
-- ARK POS - Phase 1: Core POS Schema
-- ============================================================
-- Single-tenant design (ready for multi-tenant with outlet_id)
-- Inventory deduction: real-time, allows negative stock
-- Ark Coin: topup, redeem, transaction (no transfer)
--
-- INTEGRATION WITH TALENTPOOL:
-- - HRD Module: employees (staff/cashier references)
-- - Purchasing Module: raw_materials (inventory/recipe)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PRODUCT CATALOG
-- ============================================================

-- Product categories
CREATE TABLE pos_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  parent_id uuid REFERENCES pos_categories(id),
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Products (menu items)
CREATE TABLE pos_products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sku varchar(50) UNIQUE NOT NULL,
  name varchar(200) NOT NULL,
  description text,
  category_id uuid REFERENCES pos_categories(id),
  base_price decimal(12,2) NOT NULL DEFAULT 0,
  cost_price decimal(12,2) DEFAULT 0, -- for profit calculation (from purchasing raw_materials)
  is_active boolean DEFAULT true,
  is_available boolean DEFAULT true, -- quick toggle for 86'd items
  inventory_tracking boolean DEFAULT false, -- enable stock deduction
  xp_points integer DEFAULT 0, -- XP earned per purchase
  tax_rate decimal(5,2) DEFAULT 0, -- percentage
  service_charge_rate decimal(5,2) DEFAULT 0, -- percentage
  image_url text,
  prep_time_minutes integer DEFAULT 0, -- estimated preparation time
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Product variants (e.g., Size: Small, Medium, Large)
CREATE TABLE pos_product_variants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES pos_products(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL, -- e.g., "Less Ice", "Hot", "Large"
  group_name varchar(50) NOT NULL, -- e.g., "Temperature", "Size"
  price_adjustment decimal(12,2) DEFAULT 0, -- +2000, -500, etc.
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Modifier groups (e.g., "Sugar Level", "Toppings")
CREATE TABLE pos_modifier_groups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  min_selection integer DEFAULT 0, -- 0 = optional, 1 = required
  max_selection integer DEFAULT 1, -- 1 = single, >1 = multiple
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Modifiers (individual options within a group)
CREATE TABLE pos_modifiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id uuid REFERENCES pos_modifier_groups(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  price_adjustment decimal(12,2) DEFAULT 0,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Product-Modifier relationship (which modifiers apply to which products)
CREATE TABLE pos_product_modifiers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES pos_products(id) ON DELETE CASCADE,
  modifier_group_id uuid REFERENCES pos_modifier_groups(id) ON DELETE CASCADE,
  UNIQUE(product_id, modifier_group_id)
);

-- ============================================================
-- 2. RECIPE & INVENTORY (Bill of Materials)
-- ============================================================

-- Recipe: mapping products to raw materials (from purchasing module)
CREATE TABLE pos_recipes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES pos_products(id) ON DELETE CASCADE,
  raw_material_id uuid NOT NULL, -- references purchasing.raw_materials (TalentPool)
  quantity_per_unit decimal(12,4) NOT NULL, -- e.g., 0.050 for 50ml
  unit_of_measure varchar(20) NOT NULL, -- ml, gr, pcs, etc.
  waste_percentage decimal(5,2) DEFAULT 0, -- shrinkage factor
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id, raw_material_id)
);

-- Inventory settings (per product, allows negative stock)
CREATE TABLE pos_inventory_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES pos_products(id) ON DELETE CASCADE,
  allow_negative_stock boolean DEFAULT true,
  low_stock_threshold integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- ============================================================
-- 3. CUSTOMER & CRM
-- ============================================================

-- Customers (CRM)
CREATE TABLE pos_customers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone varchar(20) UNIQUE NOT NULL,
  name varchar(100),
  email varchar(100),
  membership_tier varchar(20) DEFAULT 'bronze', -- bronze, silver, gold, platinum
  total_xp integer DEFAULT 0,
  current_xp integer DEFAULT 0,
  ark_coin_balance decimal(12,2) DEFAULT 0,
  total_spent decimal(12,2) DEFAULT 0,
  visit_count integer DEFAULT 0,
  last_visit timestamptz,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- XP configuration per product
CREATE TABLE pos_xp_config (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id uuid REFERENCES pos_products(id) ON DELETE CASCADE,
  xp_multiplier decimal(5,2) DEFAULT 1.0, -- 1.0 = base XP, 2.0 = double XP
  bonus_xp integer DEFAULT 0, -- flat bonus XP
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(product_id)
);

-- ============================================================
-- 4. ORDER MANAGEMENT
-- ============================================================

-- Order status enum
CREATE TYPE pos_order_status AS ENUM (
  'pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'
);

-- Payment method enum
CREATE TYPE pos_payment_method AS ENUM (
  'cash', 'qris', 'debit', 'credit', 'ark_coin'
);

-- Payment status enum
CREATE TYPE pos_payment_status AS ENUM (
  'unpaid', 'partial', 'paid', 'refunded'
);

-- Order types
CREATE TYPE pos_order_type AS ENUM (
  'dine_in', 'takeaway', 'delivery', 'self_order'
);

-- Employee role enum (sync with HRD module)
CREATE TYPE pos_employee_role AS ENUM (
  'pos_admin', 'pos_manager', 'pos_cashier', 'pos_kitchen', 'pos_server'
);

-- Orders
CREATE TABLE pos_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number varchar(20) UNIQUE NOT NULL, -- e.g., POS-20260426-0001
  order_type pos_order_type NOT NULL DEFAULT 'dine_in',
  status pos_order_status NOT NULL DEFAULT 'pending',
  payment_status pos_payment_status NOT NULL DEFAULT 'unpaid',
  payment_method pos_payment_method,
  
  -- Customer (nullable for walk-in)
  customer_id uuid REFERENCES pos_customers(id),
  
  -- Staff (references HRD employees)
  cashier_id uuid NOT NULL, -- references hrd.employees.id
  server_id uuid, -- references hrd.employees.id (optional)
  
  -- Financials
  subtotal decimal(12,2) NOT NULL DEFAULT 0,
  discount_amount decimal(12,2) DEFAULT 0,
  discount_reason varchar(200),
  tax_amount decimal(12,2) DEFAULT 0,
  service_charge_amount decimal(12,2) DEFAULT 0,
  total_amount decimal(12,2) NOT NULL DEFAULT 0,
  amount_paid decimal(12,2) DEFAULT 0,
  change_amount decimal(12,2) DEFAULT 0,
  
  -- Ark Coin
  ark_coins_used decimal(12,2) DEFAULT 0,
  ark_coins_earned integer DEFAULT 0,
  
  -- Notes
  notes text,
  special_requests text,
  
  -- Timestamps
  ordered_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_reason varchar(200),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE pos_order_items (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES pos_orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES pos_products(id),
  
  -- Product snapshot (in case product changes later)
  product_name varchar(200) NOT NULL,
  product_sku varchar(50) NOT NULL,
  
  -- Variants & modifiers (stored as JSON for flexibility)
  variants jsonb DEFAULT '[]'::jsonb, -- [{name: "Large", group: "Size", price: 2000}]
  modifiers jsonb DEFAULT '[]'::jsonb, -- [{name: "Less Sugar", group: "Sugar Level"}]
  
  -- Pricing
  quantity decimal(10,2) NOT NULL DEFAULT 1,
  unit_price decimal(12,2) NOT NULL,
  subtotal decimal(12,2) NOT NULL,
  discount_amount decimal(12,2) DEFAULT 0,
  total_amount decimal(12,2) NOT NULL,
  
  -- Inventory
  inventory_deducted boolean DEFAULT false,
  
  -- Kitchen status
  kitchen_status varchar(20) DEFAULT 'pending', -- pending, cooking, ready, served, cancelled
  kitchen_notes text,
  
  -- XP
  xp_earned integer DEFAULT 0,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order status history (audit trail)
CREATE TABLE pos_order_status_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES pos_orders(id) ON DELETE CASCADE,
  from_status pos_order_status,
  to_status pos_order_status NOT NULL,
  changed_by uuid NOT NULL, -- references hrd.employees.id
  changed_at timestamptz DEFAULT now(),
  notes text
);

-- ============================================================
-- 5. PAYMENT & WALLET
-- ============================================================

-- Wallet transactions (Ark Coin)
CREATE TABLE pos_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES pos_customers(id),
  type varchar(20) NOT NULL, -- topup, payment, refund, redeem
  amount decimal(12,2) NOT NULL, -- fiat amount
  ark_coins decimal(12,2) NOT NULL, -- coin amount
  balance_before decimal(12,2) NOT NULL,
  balance_after decimal(12,2) NOT NULL,
  payment_method pos_payment_method,
  xendit_transaction_id varchar(100), -- for topup via Xendit
  order_id uuid REFERENCES pos_orders(id),
  reference_id varchar(100), -- voucher code, etc.
  notes text,
  created_at timestamptz DEFAULT now()
);

-- XP transactions
CREATE TABLE pos_xp_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES pos_customers(id),
  order_id uuid REFERENCES pos_orders(id),
  xp_earned integer DEFAULT 0,
  xp_redeemed integer DEFAULT 0,
  balance_before integer NOT NULL,
  balance_after integer NOT NULL,
  description varchar(200),
  created_at timestamptz DEFAULT now()
);

-- Vouchers
CREATE TABLE pos_vouchers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code varchar(50) UNIQUE NOT NULL,
  type varchar(20) NOT NULL, -- percentage, fixed, xp_redemption
  value decimal(12,2) NOT NULL, -- percentage (0-100) or fixed amount
  min_purchase decimal(12,2) DEFAULT 0,
  max_discount decimal(12,2), -- cap for percentage vouchers
  valid_from timestamptz DEFAULT now(),
  valid_to timestamptz,
  usage_limit integer, -- total times this voucher can be used
  usage_count integer DEFAULT 0,
  per_customer_limit integer DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Customer vouchers (redeemed vouchers)
CREATE TABLE pos_customer_vouchers (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES pos_customers(id),
  voucher_id uuid REFERENCES pos_vouchers(id),
  code varchar(50) NOT NULL,
  status varchar(20) DEFAULT 'available', -- available, used, expired
  redeemed_at timestamptz DEFAULT now(),
  used_at timestamptz,
  order_id uuid REFERENCES pos_orders(id),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 6. SHIFT & CASH MANAGEMENT
-- ============================================================

-- Cashier shifts
CREATE TABLE pos_cashier_shifts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  cashier_id uuid NOT NULL, -- references hrd.employees.id
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  opening_balance decimal(12,2) NOT NULL DEFAULT 0,
  expected_closing decimal(12,2) DEFAULT 0,
  actual_closing decimal(12,2),
  variance decimal(12,2),
  variance_reason text,
  status varchar(20) DEFAULT 'open', -- open, closed, suspended
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Shift transactions (all cash movements)
CREATE TABLE pos_shift_transactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id uuid REFERENCES pos_cashier_shifts(id),
  type varchar(20) NOT NULL, -- sale, refund, void, paid_out, drop
  amount decimal(12,2) NOT NULL,
  payment_method pos_payment_method,
  order_id uuid REFERENCES pos_orders(id),
  void_reason text,
  paid_out_reason text,
  created_by uuid NOT NULL, -- references hrd.employees.id
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 7. TABLE MANAGEMENT (Restaurant)
-- ============================================================

-- Tables
CREATE TYPE pos_table_status AS ENUM ('available', 'occupied', 'reserved', 'maintenance');

CREATE TABLE pos_tables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number varchar(20) UNIQUE NOT NULL,
  capacity integer NOT NULL,
  status pos_table_status DEFAULT 'available',
  qr_code varchar(100) UNIQUE, -- for self-order
  current_order_id uuid REFERENCES pos_orders(id),
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table reservations
CREATE TABLE pos_reservations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id uuid REFERENCES pos_tables(id),
  customer_id uuid REFERENCES pos_customers(id),
  customer_name varchar(100),
  customer_phone varchar(20),
  reservation_date date NOT NULL,
  time_slot time NOT NULL,
  duration_minutes integer DEFAULT 120,
  pax_count integer NOT NULL,
  special_requests text,
  deposit_amount decimal(12,2) DEFAULT 0,
  status varchar(20) DEFAULT 'confirmed', -- confirmed, seated, completed, no_show, cancelled
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- 8. KITCHEN DISPLAY SYSTEM (KDS)
-- ============================================================

-- KDS stations (Kitchen, Bar, Dessert, etc.)
CREATE TABLE pos_kds_stations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- KDS orders (mirror of order_items for kitchen display)
CREATE TABLE pos_kds_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id uuid REFERENCES pos_orders(id) ON DELETE CASCADE,
  item_id uuid REFERENCES pos_order_items(id) ON DELETE CASCADE,
  station_id uuid REFERENCES pos_kds_stations(id),
  status varchar(20) DEFAULT 'pending', -- pending, cooking, ready, served, cancelled
  priority integer DEFAULT 0, -- 0 = normal, 1 = urgent, 2 = VIP
  started_at timestamptz,
  completed_at timestamptz,
  cooking_time_seconds integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================

-- Orders
CREATE INDEX idx_pos_orders_customer ON pos_orders(customer_id);
CREATE INDEX idx_pos_orders_cashier ON pos_orders(cashier_id);
CREATE INDEX idx_pos_orders_status ON pos_orders(status);
CREATE INDEX idx_pos_orders_ordered_at ON pos_orders(ordered_at DESC);
CREATE INDEX idx_pos_orders_order_number ON pos_orders(order_number);

-- Order items
CREATE INDEX idx_pos_order_items_order ON pos_order_items(order_id);
CREATE INDEX idx_pos_order_items_product ON pos_order_items(product_id);
CREATE INDEX idx_pos_order_items_kitchen_status ON pos_order_items(kitchen_status);

-- Customers
CREATE INDEX idx_pos_customers_phone ON pos_customers(phone);
CREATE INDEX idx_pos_customers_tier ON pos_customers(membership_tier);

-- Wallet & XP
CREATE INDEX idx_pos_wallet_customer ON pos_wallet_transactions(customer_id);
CREATE INDEX idx_pos_wallet_created ON pos_wallet_transactions(created_at DESC);
CREATE INDEX idx_pos_xp_customer ON pos_xp_transactions(customer_id);

-- Shifts
CREATE INDEX idx_pos_shifts_cashier ON pos_cashier_shifts(cashier_id);
CREATE INDEX idx_pos_shifts_status ON pos_cashier_shifts(status);

-- Tables
CREATE INDEX idx_pos_tables_status ON pos_tables(status);

-- KDS
CREATE INDEX idx_pos_kds_station ON pos_kds_orders(station_id);
CREATE INDEX idx_pos_kds_status ON pos_kds_orders(status);
CREATE INDEX idx_pos_kds_order ON pos_kds_orders(order_id);

-- ============================================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================================

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_pos_products_updated_at
  BEFORE UPDATE ON pos_products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_customers_updated_at
  BEFORE UPDATE ON pos_customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pos_tables_updated_at
  BEFORE UPDATE ON pos_tables
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- REALTIME CHANNELS (Supabase Realtime)
-- ============================================================

-- Enable realtime for critical tables
ALTER PUBLICATION supabase_realtime ADD TABLE pos_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE pos_order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE pos_kds_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE pos_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE pos_inventory_settings;

-- ============================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================

COMMENT ON TABLE pos_products IS 'Product catalog with variants and modifiers support';
COMMENT ON TABLE pos_recipes IS 'Bill of Materials: mapping products to raw_materials (purchasing module) for inventory deduction';
COMMENT ON TABLE pos_orders IS 'Main order table with status workflow and payment tracking';
COMMENT ON TABLE pos_wallet_transactions IS 'Ark Coin wallet transactions (topup, payment, redeem)';
COMMENT ON TABLE pos_kds_orders IS 'Kitchen Display System order queue';
COMMENT ON TABLE pos_cashier_shifts IS 'Cashier shift management with opening/closing balance';

-- ============================================================
-- INTEGRATION NOTES
-- ============================================================

-- HRD Integration: All cashier_id, server_id, created_by reference hrd.employees.id
-- Purchasing Integration: pos_recipes.raw_material_id references purchasing.raw_materials.id
-- Inventory Deduction: Trigger on pos_order checkout → UPDATE purchasing.raw_materials.current_stock

-- Example inventory deduction function (to be implemented in application layer or trigger):
/*
CREATE OR REPLACE FUNCTION pos_deduct_inventory()
RETURNS TRIGGER AS $$
BEGIN
  -- For each order item, deduct raw materials based on recipe
  -- Allow negative stock (per pos_inventory_settings)
  -- Log inventory movement for audit
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
*/
