# ARK POS - Backend Setup Guide

## 📋 Overview

Backend POS menggunakan **Next.js API Routes** + **Supabase** (PostgreSQL).

## 🚀 Setup Steps

### 1. Run Migrations di Supabase

Buka Supabase Dashboard → SQL Editor, lalu run:

```sql
-- Migration 1: Core Schema
-- Copy paste isi file: migrations/001_pos_core_schema.sql

-- Migration 2: Seed Data
-- Copy paste isi file: migrations/002_pos_seed_data.sql
```

**Atau via CLI:**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link ke project kamu
supabase link --project-ref <your-project-ref>

# Push migrations
supabase db push
```

### 2. Setup Environment Variables

Pastikan `.env.local` sudah ada:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... (service role key dari Supabase Settings → API)
```

### 3. Test API Endpoints

Jalankan development server:

```bash
npm run dev
```

Test dengan curl atau Postman:

```bash
# Get products
curl http://localhost:3000/api/pos/products

# Get customers
curl http://localhost:3000/api/pos/customers

# Get dashboard stats
curl http://localhost:3000/api/pos/dashboard/stats

# Create order (example)
curl -X POST http://localhost:3000/api/pos/orders \
  -H "Content-Type: application/json" \
  -d '{
    "order_type": "dine_in",
    "cashier_id": "emp-123",
    "items": [
      {
        "product_id": "prod-1",
        "product_name": "Nasi Goreng Special",
        "product_sku": "NGS-001",
        "quantity": 2,
        "unit_price": 50000,
        "subtotal": 100000,
        "total_amount": 100000
      }
    ],
    "subtotal": 100000,
    "total_amount": 100000
  }'
```

## 📁 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pos/products` | List products |
| POST | `/api/pos/products` | Create product |
| GET | `/api/pos/customers` | List customers |
| POST | `/api/pos/customers` | Create/update customer |
| GET | `/api/pos/orders` | List orders |
| POST | `/api/pos/orders` | Create order |
| PATCH | `/api/pos/orders/:id` | Update order status |
| GET | `/api/pos/dashboard/stats` | Dashboard statistics |
| POST | `/api/pos/topup` | Process Ark Coin topup |
| GET | `/api/pos/reservations` | List reservations |
| POST | `/api/pos/reservations` | Create reservation |
| PATCH | `/api/pos/reservations/:id` | Update reservation |

## 🔧 Client-Side Usage

Import helper functions di component React:

```tsx
import { getProducts, getCustomers, createOrder } from '@/lib/pos-api';

// In your component
const { data: products } = await getProducts({ search: 'nasi' });
const { data: customers } = await getCustomers({ phone: '081234567890' });
const { data: order } = await createOrder(orderData);
```

## 🗄️ Database Schema

### Core Tables:
- `pos_products` - Product catalog
- `pos_product_variants` - Product variants (size, temp, etc.)
- `pos_modifier_groups` & `pos_modifiers` - Customization options
- `pos_customers` - CRM with Ark Coin balance
- `pos_orders` & `pos_order_items` - Order management
- `pos_wallet_transactions` - Ark Coin topup/spend history
- `pos_reservations` - Table reservations
- `pos_tables` - Table management

### Integration Tables (existing):
- `hrd.employees` - Staff/cashier references
- `purchasing.raw_materials` - Inventory for recipes
- `pos_recipes` - Bill of Materials (product → raw materials)

## 🔐 Authentication

API menggunakan **Supabase Service Role Key** untuk bypass RLS. Untuk production:

1. Enable RLS di semua tabel POS
2. Gunakan user JWT dari `@supabase/auth-helpers-nextjs`
3. Buat policies per role (admin, cashier, manager)

Example policy:

```sql
-- Cashiers can only create/read orders
CREATE POLICY "Cashiers can create orders"
ON pos_orders FOR INSERT
TO authenticated
WITH CHECK (auth.jwt()->>'role' IN ('pos_cashier', 'pos_manager', 'pos_admin'));
```

## 📊 Next Steps

1. ✅ Run migrations di Supabase
2. ✅ Test API endpoints
3. ⏳ Update UI components untuk connect ke API
4. ⏳ Implement inventory deduction on order checkout
5. ⏳ Add Xendit integration for QRIS payments
6. ⏳ Setup realtime subscriptions for KDS

## 🆘 Troubleshooting

**Error: "Missing Supabase credentials"**
→ Pastikan `.env.local` ada dan berisi `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`

**Error: "relation does not exist"**
→ Run migrations dulu di Supabase SQL Editor

**Error CORS**
→ Tambahkan domain kamu di Supabase Dashboard → Authentication → URL Configuration
