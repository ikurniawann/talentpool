# Arkiv OS

Arkiv OS adalah ERP terpadu berbasis Next.js dan Supabase untuk operasional Aapex Technology. Sistem ini mencakup HRIS, rekrutmen, POS, CRM loyalty, purchasing, inventory, produksi, reporting QA, Arkiv OS desktop, serta beberapa self-service flow untuk customer.

## Tech Stack

| Layer | Teknologi |
| --- | --- |
| Framework | Next.js App Router, React |
| Database | Supabase PostgreSQL, Auth, Storage |
| Styling | Tailwind CSS v4, shadcn/ui, custom Arkiv OS design system |
| Data & Form | React Hook Form, Zod, TanStack Query |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| Email | Resend |
| WhatsApp | Fonnte API |
| Deployment | Vercel |
| AI | Ollama cloud models untuk Arkiv OS AI Assistant |

## Current Development Status

Progress terbaru ada di `docs/purchasing/HANDOFF_2026-05-25_POS_PURCHASING_PRODUCTION.md`.
Fokus terakhir adalah integrasi POS, Purchasing, Production, WIP inventory, HPP/COGS, stock card, dan laporan profit POS.

Sudah berjalan:
- Production complete untuk finished good dan WIP.
- WIP bisa menjadi raw material type `WIP` dan dipakai ulang dalam BOM produk final.
- HPP aktual produk jadi tersinkron ke `pos_products.cost_price`.
- POS order item menyimpan snapshot profit: `cost_price`, `cost_total`, `gross_profit`, `gross_margin_pct`.
- POS Profit Report tersedia di `/dashboard/pos/reports/profit`.
- API profit report tersedia di `/api/pos/reports/profit` dengan breakdown produk, kategori, station, kasir, dan tanggal.

Catatan QA terakhir:
- Scoped ESLint untuk POS profit report sudah lolos.
- `npm run build` pernah menggantung di tahap optimized production build pada worktree ini.
- `npx tsc --noEmit` masih gagal karena error existing di area lain seperti route params Next 16, purchasing pages, POS backup, dan shared UI components.
- Worktree lokal ini belum memiliki `.env.local`, jadi QA browser/API live butuh env Supabase terlebih dahulu.

Next task yang disarankan:
1. QA end-to-end production finished good sampai HPP aktual masuk ke POS.
2. QA order POS paid/open bill dan pastikan snapshot profit masuk ke `pos_order_items`.
3. QA `/dashboard/pos/reports/profit` dengan data real.
4. Bereskan error TypeScript existing agar `npx tsc --noEmit` dan `npm run build` bisa menjadi gate kolaborasi.

## Module Overview

### Arkiv OS Desktop

Route utama:
- `/arkiv-os`
- `/qa`

Fitur:
- Desktop-style launcher untuk membuka module bisnis dalam window.
- AI Assistant dengan mode context project atau general knowledge.
- Pengaturan AI Assistant di Arkiv OS Settings, termasuk pilihan LLM.
- QA progress dashboard sementara di `/qa` untuk ringkasan progress dan test result.

Dokumentasi terkait:
- `Arkiv_progress.md`
- `docs/qa/QA_REPORT_ARKIV_OS_PROGRESS_2026-05-24.md`

### HRIS

Route utama:
- `/dashboard/hris`
- `/dashboard/hris/employees`
- `/dashboard/hris/attendance`
- `/dashboard/hris/leaves`
- `/dashboard/hris/payroll`
- `/dashboard/hris/performance`
- `/dashboard/hris/reports`

Fitur:
- Master karyawan, department, position, employment status.
- Attendance, leave request, leave balance, salary, payroll, payslip.
- Onboarding dan offboarding.
- Performance management, KPI templates, employee KPI, review, behavioral score, development plan.
- HRIS reporting.
- Integrasi Talent Pool ke employee.

Dokumentasi terkait:
- `docs/hris/HRIS_FASE_0_COMPLETION.md`
- `docs/hris/HRIS_FASE1_COMPLETE.md`
- `docs/hris/HRIS_FASE2_PAYROLL_COMPLETE.md`
- `docs/hris/HRIS_FASE3_KPI_PERFORMANCE.md`

### Recruitment dan Career Portal

Route utama:
- `/career`
- `/portal`
- `/dashboard/hris/candidates`
- `/dashboard/hris/pipeline`
- `/dashboard/hris/talent-pool`
- `/dashboard/hris/job-portal`

Fitur:
- Portal publik untuk kandidat.
- Candidate management.
- Pipeline rekrutmen.
- Talent pool.
- Job opening dan job portal management.
- Candidate promotion ke HRIS employee.

Dokumentasi terkait:
- `docs/recruitment/TASK_COMPLETION_REPORT.md`
- `docs/360-feedback-system.md`

### POS F&B

Route utama:
- `/dashboard/pos`
- `/dashboard/pos/cashier-new`
- `/dashboard/pos/products`
- `/dashboard/pos/open-bills`
- `/dashboard/pos/kds`
- `/dashboard/pos/orders`
- `/dashboard/pos/reports/profit`
- `/dashboard/pos/print-queue`
- `/dashboard/pos/printer-settings`
- `/dashboard/pos/topup`
- `/dashboard/pos/reservation`

Fitur:
- Cashier POS untuk F&B.
- Product management, category, variant, modifier, station routing.
- Dine-in, takeaway, customer search, add customer/member dari POS.
- Table management dan open bill.
- Save/open bill, bayar bill, dan status order.
- KDS station routing untuk kitchen, bar, bakery, dessert, merchandise, photobooth.
- Print queue untuk kitchen/bar/customer ticket.
- Shift open/close flow.
- ARK Coin top-up.
- Reservation.
- Sinkron produk purchasing ke POS.
- Sinkron HPP aktual produksi ke `pos_products.cost_price`.
- Snapshot profit item order: `cost_price`, `cost_total`, `gross_profit`, `gross_margin_pct`.
- Profit report: revenue, COGS, gross profit, gross margin, zero-cost item warning, breakdown produk/kategori/station/kasir/tanggal, dan export CSV.

Dokumentasi terkait:
- `docs/pos/POS.md`
- `docs/pos/POS_DEVELOPMENT_PLAN.md`
- `docs/pos/POS-BACKEND-SETUP.md`
- `docs/pos/POS_INTEGRATION_GUIDE.md`
- `docs/pos-print-queue-worker.md`
- `SPLIT_BILL_PLAN.md`

### Table Self-Service Ordering

Route utama:
- `/table-order/[tableCode]`

Fitur:
- QR table ordering untuk customer dine-in.
- Member lookup atau guest checkout.
- Menu 2 kolom mobile dengan XP per produk.
- Variant modal saat add to cart.
- Floating order summary.
- Payment method options: QRIS, ARK Coin, VA, bayar di kasir.
- Order status dan repeat order setelah transaksi terkirim.
- Auto routing order ke kitchen/bar melalui POS/KDS backend.

Dokumentasi terkait:
- `docs/pos/TABLE_SELF_SERVICE_ORDERING_PLAN.md`

### Photobooth Self-Service POS

Route utama:
- `/photobooth/self-service`

Fitur:
- UI self-service POS khusus photobooth, terpisah dari POS F&B.
- Tap Member Card.
- Payment melalui POS payment layer.
- Disiapkan untuk integrasi partner/vendor photobooth.
- Partner callback akan dipakai untuk update XP setelah sesi photobooth sukses.

Dokumentasi terkait:
- `docs/crm/PHOTOBOOTH_SELF_SERVICE_POS_PLAN.md`
- `docs/crm/PHOTOBOOTH_PARTNER_INTEGRATION_GUIDE.md`

### CRM, Membership, Loyalty, dan Rewards

Route utama:
- `/dashboard/crm`
- `/dashboard/crm/members`
- `/dashboard/crm/members/[id]`
- `/dashboard/crm/rewards`
- `/dashboard/crm/avatars`

Fitur:
- Customer dan member database.
- Membership tiering.
- XP dan ARK Coin loyalty engine.
- XP rules dari POS products.
- Member loyal, top spender ARK Coin, top spender transaksi.
- Reward redeem: discount, merchandise, avatar collectible.
- Avatar catalog dan customer-owned avatar collection concept.
- Integrasi XP dari POS, photobooth, dan future third-party game partner.

Dokumentasi terkait:
- `docs/crm/CRM_MEMBERSHIP_LOYALTY_PLAN.md`
- `docs/crm/CRM_DEVELOPMENT_PROGRESS.md`
- `docs/xp-system/XP_SYSTEM_SUMMARY.md`
- `docs/xp-system/XP_SYSTEM_INTEGRATION.md`
- `docs/xp-system/XP_INTEGRATION_EXAMPLES.md`

### Purchasing dan Procurement

Route utama:
- `/dashboard/purchasing`
- `/dashboard/purchasing/suppliers`
- `/dashboard/purchasing/raw-materials`
- `/dashboard/purchasing/units`
- `/dashboard/purchasing/products`
- `/dashboard/purchasing/products/[id]/bom`
- `/dashboard/purchasing/price-list`
- `/dashboard/purchasing/pr`
- `/dashboard/purchasing/po`
- `/dashboard/purchasing/grn`
- `/dashboard/purchasing/delivery`
- `/dashboard/purchasing/qc`
- `/dashboard/purchasing/returns`
- `/dashboard/purchasing/reports`

Fitur:
- Supplier master data.
- Raw material master data, termasuk material type `PURCHASED` dan `WIP`.
- Unit management.
- Product master untuk produk yang diproduksi atau disinkronkan ke POS.
- Recipe/BOM editor dengan support WIP sebagai bahan BOM.
- Price list supplier.
- Purchase Request.
- Purchase Order.
- Barang Masuk workspace: delivery dan receiving digabung berbasis status.
- QC dan return.
- Inventory adjustment dan movement.
- Reports: inventory valuation, PO summary, PO detail, supplier performance, stock card.

Dokumentasi terkait:
- `docs/purchasing/README.md`
- `docs/purchasing/PURCHASING_DEVELOPMENT_PLAN.md`
- `docs/purchasing/PURCHASING_PRODUCTION_PROGRESS_2026-05-24.md`
- `docs/purchasing/GRN-LOGIC-REVIEW.md`

### Production, WIP, HPP, dan COGS

Route utama:
- `/dashboard/purchasing/production`
- `/dashboard/purchasing/production/orders/[id]`
- `/dashboard/purchasing/production/recipes`
- `/dashboard/purchasing/reports/hpp-breakdown`
- `/dashboard/purchasing/reports/stock-card`

Fitur:
- List produk yang bisa diproduksi.
- Production order lifecycle: draft, release, start, complete, cancel.
- Cek ulang stok bahan.
- Complete production mengurangi stok bahan baku.
- Output produk jadi masuk finished goods inventory.
- Output WIP masuk stok bahan sebagai raw material type `WIP`.
- WIP bisa dipakai sebagai komponen BOM produk final.
- HPP WIP terbawa ke HPP produk final melalui average cost inventory.
- HPP aktual produk jadi tersinkron ke POS `cost_price`.
- Stock card untuk audit movement raw material dan WIP.

### Inventory

Route utama:
- `/dashboard/inventory`
- `/dashboard/inventory/low-stock`
- `/dashboard/inventory/[id]`
- `/dashboard/purchasing/reports/stock-card`

Fitur:
- Stok bahan baku.
- Low stock.
- Inventory movement.
- Stock adjustment.
- Stock card per material.
- Valuation report.
- Integrasi receiving, return, production consumption, dan WIP output.

Dokumentasi terkait:
- `docs/inventory/INVENTORY-ANALYSIS.md`
- `docs/inventory/INVENTORY-TEST-PLAN.md`
- `docs/inventory/QUICK-INVENTORY-TEST.md`

### Reporting dan QA

Route utama:
- `/qa`
- `/dashboard/purchasing/reports`
- `/dashboard/hris/reports`
- `/dashboard/pos`
- `/dashboard/pos/reports/profit`

Fitur:
- QA progress page.
- Purchasing reports.
- HRIS reports.
- POS dashboard.
- POS profit report berbasis item-level cost snapshot.

### Master Data dan Settings

Route utama:
- `/dashboard/master/departments`
- `/dashboard/master/positions`
- `/dashboard/master/employment-statuses`
- `/dashboard/settings`

Fitur:
- Department.
- Position.
- Employment status.
- Global settings.
- Arkiv OS settings.

## API Surface

### HRIS

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET/POST | `/api/hris/employees` | Employee list dan create |
| GET/PUT/DELETE | `/api/hris/employees/[id]` | Detail, update, soft delete employee |
| GET/POST | `/api/hris/attendance` | Attendance |
| GET/POST | `/api/hris/leaves` | Leave request |
| POST | `/api/hris/leaves/approve` | Approve/reject leave |
| GET/POST | `/api/hris/payroll` | Payroll |
| GET/POST | `/api/hris/performance/reviews` | Performance review |
| GET/POST | `/api/hris/performance/employee-kpis` | Employee KPI |
| GET | `/api/hris/reports` | HRIS report |
| POST | `/api/hris/promote` | Promote kandidat ke employee |

### Recruitment

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET/POST | `/api/candidates` | Candidate list dan create |
| GET/PUT/DELETE | `/api/candidates/[id]` | Candidate detail dan update |
| POST | `/api/candidates/[id]/cv-upload` | Upload CV |
| POST | `/api/portal/submit` | Submit lamaran publik |

### POS

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET/POST | `/api/pos/products` | POS product list dan create |
| GET/PUT/DELETE | `/api/pos/products/[id]` | POS product detail dan update |
| POST | `/api/pos/products/sync-purchasing` | Sync purchasing product ke POS |
| GET/POST | `/api/pos/orders` | POS order list dan create paid order |
| PATCH | `/api/pos/orders/[id]` | Update order/payment |
| POST | `/api/pos/orders/open-bill` | Create open bill |
| GET | `/api/pos/reports/profit` | Profit report: revenue, COGS, gross profit, margin, breakdown |
| GET | `/api/pos/kds` | Kitchen display data |
| GET/POST | `/api/pos/print-jobs` | Print queue |
| GET/POST | `/api/pos/shifts` | POS shift |
| POST | `/api/pos/shifts/[id]/close` | Close shift |
| GET/POST | `/api/pos/topup` | ARK Coin top-up |

### Table Order

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET | `/api/table-order/session/[tableCode]` | Resolve table order session |
| GET | `/api/table-order/products` | Product list untuk table order |
| POST | `/api/table-order/orders` | Submit customer table order |
| POST | `/api/table-order/customers/lookup` | Lookup member/customer |

### CRM

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET | `/api/crm/dashboard` | CRM dashboard summary |
| GET/POST | `/api/crm/members` | Member list dan create |
| GET/PUT/DELETE | `/api/crm/members/[id]` | Member detail dan update |
| GET/POST | `/api/crm/tiers` | Membership tier |
| GET/POST | `/api/crm/xp-rules` | XP rules |
| GET/POST | `/api/crm/rewards` | Reward catalog |
| GET/POST | `/api/crm/redemptions` | Reward redemption |
| GET/POST | `/api/crm/avatars` | Avatar catalog |
| GET | `/api/crm/avatar-inventory` | Avatar ownership inventory |
| GET/POST | `/api/pos/topup` | ARK Coin integration |
| GET/POST | `/api/pos/products` | XP per product integration |

Catatan: sebagian logic CRM berada di `src/lib/crm/loyalty-engine.ts` dan dipanggil dari POS order flow.

### Purchasing, Inventory, Production

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| GET/POST | `/api/purchasing/suppliers` | Supplier |
| GET/POST | `/api/purchasing/raw-materials` | Raw material |
| GET/POST | `/api/purchasing/units` | Unit |
| GET/POST | `/api/purchasing/products` | Purchasing product |
| GET/POST | `/api/purchasing/products/[id]/bom` | Product BOM |
| GET/POST | `/api/purchasing/price-list` | Supplier price list |
| GET/POST | `/api/purchasing/pr` | Purchase Request |
| GET/POST | `/api/purchasing/po` | Purchase Order |
| GET/POST | `/api/purchasing/delivery` | Supplier delivery |
| GET/POST | `/api/purchasing/grn` | Receiving / Barang Masuk |
| GET/POST | `/api/purchasing/qc` | Quality Control |
| GET/POST | `/api/purchasing/returns` | Return |
| GET/POST | `/api/purchasing/inventory/adjustment` | Inventory adjustment |
| GET | `/api/purchasing/inventory/movements` | Inventory movement |
| GET | `/api/purchasing/cogs/product/[id]` | Product COGS |
| GET/POST | `/api/purchasing/production/orders` | Production order |
| PATCH | `/api/purchasing/production/orders/[id]` | Release, start, complete, cancel, recheck stock |
| GET | `/api/purchasing/production/wip` | WIP inventory |
| GET | `/api/purchasing/reports/stock-card` | Inventory stock card |
| GET | `/api/purchasing/reports/inventory-valuation` | Inventory valuation |
| GET | `/api/purchasing/reports/po-summary` | PO summary |
| GET | `/api/purchasing/reports/supplier-performance` | Supplier performance |

### AI Assistant

| Method | Endpoint | Deskripsi |
| --- | --- | --- |
| POST | `/api/ai/assistant` | Arkiv OS AI Assistant |

## Database Highlights

### HRIS
- `employees`
- `departments`
- `employment_statuses`
- `employee_salaries`
- `attendance`
- `leaves`
- `payroll`
- `employee_kpis`
- `performance_reviews`
- `development_plans`

### Recruitment
- `candidates`
- `job_openings`
- `feedback_cycles`
- `feedback_assignments`
- `feedback_responses`

### POS
- `pos_products`
- `pos_categories`
- `pos_product_variants`
- `pos_modifier_groups`
- `pos_modifiers`
- `pos_orders`
- `pos_order_items`
- `pos_tables`
- `pos_print_jobs`
- `pos_shifts`
- `pos_customers`

Profit-related POS order item fields:
- `cost_price`
- `cost_total`
- `gross_profit`
- `gross_margin_pct`

### CRM
- `crm_members`
- `crm_xp_rules`
- `crm_xp_transactions`
- `crm_rewards`
- `crm_reward_redemptions`
- `crm_avatars`
- `crm_member_avatars`

### Purchasing, Inventory, Production
- `suppliers`
- `raw_materials`
- `units`
- `supplier_price_lists`
- `products`
- `bom_items`
- `purchase_requests`
- `purchase_orders`
- `po_items`
- `deliveries`
- `grn`
- `gr_items`
- `qc_inspections`
- `returns`
- `inventory`
- `inventory_movements`
- `production_orders`
- `production_order_materials`
- `production_batches`
- `finished_goods_inventory`

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FONNTE_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
AI_ASSISTANT_OLLAMA_API_BASE=
OLLAMA_API_BASE=
OLLAMA_API_KEY=
OLLAMA_MODEL=
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.local.example .env.local
```

Isi credentials Supabase, email, WhatsApp, dan AI sesuai kebutuhan.

### 3. Supabase Setup

Jalankan semua migration di `supabase/migrations/`.

```bash
supabase db push
```

Jika migration dijalankan manual dari dashboard Supabase, gunakan urutan timestamp file di folder `supabase/migrations/`.

### 4. Run Development Server

```bash
npm run dev
```

Buka:

```text
http://localhost:3000
http://localhost:3000/arkiv-os
http://localhost:3000/dashboard/pos/products
http://localhost:3000/dashboard/purchasing
```

## Collaboration Guide

Untuk programmer yang lanjut mengerjakan project ini:

1. Baca dulu `docs/purchasing/HANDOFF_2026-05-25_POS_PURCHASING_PRODUCTION.md`, `Arkiv_progress.md`, dan `PROGRESS.md`.
2. Jangan reset/revert perubahan lokal tanpa koordinasi karena beberapa module saling terkait.
3. Jalankan `npm install` atau `npm ci`, lalu siapkan `.env.local` berisi Supabase dan service key.
4. Mulai dari QA flow POS dan Production:
   - complete production finished good,
   - cek `pos_products.cost_price`,
   - buat POS order paid/open bill,
   - cek snapshot profit di `pos_order_items`,
   - buka `/dashboard/pos/reports/profit`.
5. Kalau membuat perubahan database, tambahkan migration di `supabase/migrations/` dan dokumentasikan efeknya di README atau docs module terkait.
6. Sebelum merge, minimal jalankan scoped lint untuk file yang diubah. Full typecheck/build saat ini masih punya error existing yang perlu dibereskan terpisah.

## Project Structure

```text
src/
├── app/
│   ├── arkiv-os
│   ├── dashboard
│   ├── photobooth/self-service
│   ├── table-order/[tableCode]
│   ├── qa
│   ├── dashboard/pos
│   ├── dashboard/(dashboard)/hris
│   ├── dashboard/(dashboard)/crm
│   ├── dashboard/(dashboard)/purchasing
│   ├── dashboard/(dashboard)/inventory
│   ├── dashboard/(dashboard)/master
│   ├── (public)/career
│   ├── (public)/portal
│   └── api/
├── components/
│   ├── ui/
│   ├── pos/
│   └── layout/
├── hooks/
├── lib/
│   ├── api/
│   ├── crm/
│   ├── inventory/
│   ├── pos/
│   ├── purchasing/
│   └── supabase/
├── modules/
│   └── purchasing/
└── types/
```

## Roles

| Role | Akses Utama |
| --- | --- |
| `admin` / `super_admin` | Semua module |
| `hrd` | HRIS, recruitment, employee, performance |
| `purchasing_admin` | Purchasing, procurement, inventory, production |
| `purchasing_manager` | Approval, purchasing report, production |
| `warehouse_admin` / `warehouse_staff` | Receiving, inventory, QC, stock card |
| `finance_staff` | COGS, report, finance-related approval |
| `pos_admin` | POS configuration, product, station, report |
| `cashier` | POS cashier, order, payment |
| `direksi` | Dashboard dan report |

## Design Notes

- Arkiv OS memakai aksen pink sebagai primary action.
- Dashboard operasional dibuat padat, scannable, dan action-oriented.
- POS dan self-service flow mengutamakan touch-friendly controls.
- Purchasing memakai istilah operasional Indonesia seperti Barang Masuk, Produksi, dan Recipe/BOM.
- Dropdown dan clickable UI harus memiliki cursor/action affordance yang jelas.

## Important Docs

- `docs/purchasing/README.md`
- `docs/purchasing/HANDOFF_2026-05-25_POS_PURCHASING_PRODUCTION.md`
- `docs/purchasing/PURCHASING_PRODUCTION_PROGRESS_2026-05-24.md`
- `docs/crm/CRM_DEVELOPMENT_PROGRESS.md`
- `docs/pos/POS_DEVELOPMENT_PLAN.md`
- `docs/qa/QA_REPORT_ARKIV_OS_PROGRESS_2026-05-24.md`
- `docs/purchasing/PROJECT_STANDARDS.md`
- `docs/AGENTS.md`
