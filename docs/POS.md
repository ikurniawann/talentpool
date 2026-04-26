# POS Module - ARK POS Architecture & Design Brief

## Project Overview

**Project Name:** ARK POS  
**Type:** Enterprise-grade Hospitality & Retail Platform  
**Tagline:** Multi-tenant, Offline-first, Real-time Sync  

---

## Core Design Principles

1. **Multi-tenant by design** - Satu codebase untuk retail, F&B, MICE
2. **Modular & Configurable** - Fitur bisa di-enable/disable per merchant
3. **Offline-first** - POS harus tetap jalan saat internet down
4. **Real-time sync** - Kitchen display, inventory, CRM sync realtime
5. **Audit trail** - Setiap transaksi & perubahan kasir harus ter-track

---

## Target Markets

- 🍽️ **F&B**: Restaurant, Cafe, Cloud Kitchen
- 🏪 **Retail**: Minimarket, Boutique, Grocery
- 🎉 **MICE**: Event venues, Conference halls, Wedding organizers
- 🏨 **Hospitality**: Hotel F&B, Resort outlets

---

## Database Architecture

### 1. Product Architecture (Multi-Variant)

```sql
products
├── id, name, category_id, base_price, is_active
├── inventory_tracking: boolean (enable/disable stock deduction)
├── xp_points: integer (default XP per purchase)
└── ...

product_variants
├── id, product_id, name (e.g., "Less Ice", "Hot", "Large")
├── price_adjustment: decimal (+2000, -500, etc.)
└── ...

product_modifiers (for customizations)
├── id, product_id, modifier_group_id
└── ...

modifier_groups
├── id, name (e.g., "Sugar Level", "Temperature")
├── min_selection: integer (0 = optional, 1 = required)
├── max_selection: integer (1 = single, >1 = multiple)
└── ...

recipe_ingredients (Bill of Materials)
├── id, product_id, raw_material_id (from purchasing module)
├── quantity_per_unit, unit_of_measure
└── waste_percentage: decimal (for shrinkage calculation)
```

### 2. Order Flow (State Machine)

```sql
orders
├── id, order_number, outlet_id, table_id (nullable for retail)
├── order_type: enum ('dine_in', 'takeaway', 'delivery', 'self_order', 'mice')
├── status: enum ('pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled')
├── customer_id (nullable for walk-in)
├── subtotal, discount, tax, service_charge, total
├── payment_status: enum ('unpaid', 'partial', 'paid', 'refunded')
├── staff_id (cashier), kitchen_staff_id (optional)
├── notes, special_requests
└── ...

order_items
├── id, order_id, product_id, variant_ids: jsonb
├── modifiers: jsonb (selected customizations)
├── quantity, unit_price, total
├── status: enum ('pending', 'cooking', 'ready', 'served', 'cancelled')
├── xp_earned: integer
└── ...

order_status_history (audit trail)
├── id, order_id, from_status, to_status
├── changed_by: user_id
└── changed_at: timestamp
```

### 3. Payment & Ark Coin Wallet

```sql
customers
├── id, name, phone (unique), email
├── membership_tier: enum ('bronze', 'silver', 'gold', 'platinum')
├── total_xp: integer, current_xp: integer
├── ark_coin_balance: decimal
├── total_spent: decimal, visit_count: integer
├── last_visit: timestamp
└── ...

wallet_transactions
├── id, customer_id, type: enum ('topup', 'payment', 'refund', 'redeem')
├── amount, ark_coins, balance_before, balance_after
├── reference_id (order_id, payment_id)
└── created_at
```

---

## Core Modules

### 1. Merchant & Outlet Management
- Multi-outlet support
- Outlet-specific settings (tax, service charge, currency)
- Business hours & holiday schedules
- Table management (for F&B)

### 2. Product & Menu Catalog
- Multi-category hierarchy
- Product variants (size, temperature, customization)
- Modifier groups (required/optional selections)
- Dynamic pricing (time-based, happy hour)
- Product bundling (combo meals)

### 3. Inventory & Recipe (BOM)
- Bill of Materials per product
- Real-time stock deduction on order
- Waste tracking & shrinkage
- Low stock alerts → Auto PO suggestions
- Integration with Purchasing module

### 4. Order Management
- Multi-channel orders (dine-in, takeaway, delivery, self-order kiosk, MICE events)
- Order status workflow with audit trail
- Split bills & merge orders
- Order modifications (add/remove items)
- Refund & void management

### 5. Payment & Wallet (Ark Coin)
- Multiple payment methods: Cash, Card, QRIS, E-wallet, Ark Coin
- Split payments (partial cash, partial wallet)
- Tip management
- Change calculation
- Payment gateway integration

### 6. CRM & Loyalty (XP System)
- Customer profiles with purchase history
- Tiered membership (Bronze, Silver, Gold, Platinum)
- XP points earning & redemption
- Ark Coin digital wallet
- Personalized promotions

### 7. Staff & Roles
- Role-based access control (Admin, Manager, Cashier, Kitchen Staff)
- Staff performance tracking
- Commission tracking (for upselling)
- Shift scheduling

### 8. Shift & Cash Management
- Opening/closing cash registers
- Cash in/out tracking
- End-of-day reconciliation
- Cashier shift reports
- Discrepancy tracking

### 9. Kitchen Display System (KDS)
- Real-time order queue
- Order prioritization (VIP, rush, normal)
- Cook time tracking
- Item availability toggle (86 items)
- Kitchen staff assignment

### 10. Reservation & MICE
- Table reservations
- Event booking (weddings, conferences)
- Deposit management
- Guest count tracking
- Package menus for events

---

## Integration Points

### HRD Module
- Employee data as POS staff
- Role synchronization
- Auto-disable on resignation
- Shift attendance linked to POS shifts
- Performance reports

### Purchasing Module
- Unified inventory (raw materials)
- Recipe-based stock deduction
- Low stock → PO auto-suggestion
- Supplier price lists
- GRN impact on POS availability

### Inventory Module
- Real-time stock levels
- Stock adjustments (waste, spoilage)
- Transfer between outlets
- Stock take & reconciliation

### Accounting Module
- Daily sales journal entries
- Payment reconciliation
- Tax reporting
- Revenue recognition

---

## Technical Requirements

### Frontend (Next.js)
- **Framework:** Next.js 16+ with App Router
- **Styling:** Tailwind CSS 4
- **State:** React Query + Zustand
- **Offline:** Service Worker + IndexedDB
- **Real-time:** WebSocket / Supabase Realtime

### Backend (Supabase)
- **Database:** PostgreSQL with Row Level Security
- **Auth:** Supabase Auth with custom roles
- **Storage:** Supabase Storage for product images
- **Functions:** Edge Functions for business logic
- **Real-time:** Supabase Realtime subscriptions

### Deployment
- **Platform:** Vercel (frontend) + Supabase (backend)
- **CDN:** Vercel Edge Network
- **Monitoring:** Vercel Analytics + Supabase Logs

---

## Development Phases

### Phase 1: Core POS (Current Sprint)
- [x] Database schema design
- [x] UI mockups (static)
- [ ] Product CRUD with variants
- [ ] Basic cashier interface
- [ ] Simple payment flow
- [ ] Receipt printing

### Phase 2: Advanced Features
- [ ] Recipe & inventory integration
- [ ] Customer profiles & loyalty
- [ ] Multi-payment split
- [ ] Discount & promotion engine
- [ ] Tax & service charge config

### Phase 3: Enterprise Features
- [ ] Multi-outlet management
- [ ] KDS integration
- [ ] Reservation system
- [ ] MICE module
- [ ] Advanced reporting

### Phase 4: Optimization
- [ ] Offline mode
- [ ] Performance tuning
- [ ] Mobile app (React Native)
- [ ] Self-order kiosk UI
- [ ] API for 3rd party integrations

---

## UI/UX Guidelines

### Design System
- **Colors:** Professional, clean, high contrast for readability
- **Typography:** Clear, legible fonts (Inter, SF Pro)
- **Spacing:** Consistent 4px grid system
- **Icons:** Lucide React for consistency

### Key Screens

#### Cashier Interface
- **Left Panel:** Product grid with search & filters
- **Right Panel:** Shopping cart with quick actions
- **Bottom Bar:** Quick totals & checkout button
- **Mobile:** Stacked layout, swipeable cart

#### Product Management
- Grid/List view toggle
- Quick edit inline
- Bulk actions (enable/disable, price update)
- Image upload drag & drop

#### Order Dashboard
- Kanban board for order status
- Color-coded by status/type
- Quick filters (today, pending, completed)
- Search by order number/customer

#### Reports & Analytics
- Dashboard with key metrics
- Custom date range picker
- Export to CSV/PDF
- Visual charts (Recharts)

---

## Success Metrics

### Performance
- Page load < 2s
- Transaction completion < 30s
- Offline mode: unlimited duration
- Real-time sync delay < 1s

### Usability
- New cashier training < 15 minutes
- Order entry < 3 clicks for repeat orders
- Zero data loss on network failure
- 99.9% uptime SLA

### Business
- Support 100+ concurrent outlets
- Handle 10,000+ orders/day
- Multi-currency support (IDR, USD, SGD)
- Scalable to 1M+ customers

---

## Notes

- **Priority:** Stability > Features > Performance
- **Security:** PCI DSS compliance for payments
- **Compliance:** Indonesian tax regulations (e-Faktur ready)
- **Localization:** Bahasa Indonesia first, English second

---

**Last Updated:** 2026-04-26  
**Status:** Architecture approved, Phase 1 in progress  
**Next Review:** After Phase 1 completion
