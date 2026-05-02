# Arkiv OS — Purchasing Module

Dokumentasi untuk modul Purchasing / Procurement pada Arkiv OS ERP.

## Business Flow

```
Purchase Request (PR)          Purchase Order (PO)           Goods Receipt (GRN)
┌─────────────────┐           ┌─────────────────┐          ┌─────────────────┐
│ 1. Staff buat   │           │ 5. Convert dari  │          │ 9. Barang        │
│    PR (draft)   │───────────│    PR approved   │──────────│    sampai       │
│                 │  submit  │                  │   send  │    gudang       │
│ 2. Head Dept    │           │ 6. PO di-approve │          │                 │
│    approve      │───────────│    (Manager/Dir) │──────────│ 10. QC check    │
│                 │  approve │                  │  arrive │                 │
│ 3. Finance      │           │ 7. PO dikirim ke  │          │ 11. Inventory   │
│    (jika ≥thr)  │───────────│    supplier      │──────────│    updated      │
│                 │  approve │                  │          │                 │
│ 4. Direksi      │           │ 8. Supplier      │          │ 12. PO status   │
│    (jika ≥thr)  │───────────│    kirim barang   │──────────│    = RECEIVED   │
└─────────────────┘           └─────────────────┘          └─────────────────┘

Approval Thresholds:
- < Rp 5.000.000   → Head Dept only
- Rp 5-25jt        → + Finance
- > Rp 25jt        → + Direksi
```

## Setup & Installation

### 1. Clone & Install Dependencies

```bash
cd ~/Desktop/arkiv-os
npm install
```

### 2. Database Migration

Jalankan migration untuk schema Purchasing module:

```bash
# Menggunakan Supabase CLI
supabase db push

# Atau手动 run file migration:
# supabase/migrations/20250419_purchasing_module.sql
# supabase/migrations/20250419_002_create_supplier_table.sql
# supabase/migrations/20250420_add_supplier_fields.sql
```

### 3. Environment Variables

Buat `.env.local` dari `.env.example`:

```bash
cp .env.example .env.local
```

Variable yang dibutuhkan:

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ...` |
| `NEXT_PUBLIC_BASE_URL` | Base URL untuk API docs | `http://localhost:3000` |
| `PO_APPROVAL_HEAD_THRESHOLD` | Threshold Head approve (default: 5000000) | `5000000` |
| `PO_APPROVAL_FINANCE_THRESHOLD` | Threshold Finance (default: 25000000) | `25000000` |

### 4. Run Development Server

```bash
npm run dev
```

Buka:
- API Docs (Swagger UI): `http://localhost:3000/api/purchasing/docs`
- Frontend: `http://localhost:3000/purchasing`

## API Documentation

### Base URL

```
Development: http://localhost:3000/api/purchasing
Production:  https://ornjixodzontnanhfyhd.supabase.co/api/purchasing
```

### Authentication

Semua endpoint membutuhkan Bearer JWT token:

```
Authorization: Bearer <access_token>
```

Token diperoleh dari Supabase Auth. Login via `/api/auth/login`.

### User Roles

| Role | Akses |
|---|---|
| `purchasing_admin` | Full access semua endpoint |
| `purchasing_staff` | CRUD supplier, buat PR/PO, submit |
| `purchasing_manager` | Approve PO, lihat reports |
| `warehouse_staff` | Terima barang (GRN), QC |
| `finance_staff` | Approve finance, lihat COGS |
| `hrd` | Approve PR |
| `direksi` | Final approval |

### Core Endpoints

#### Master Data
| Method | Path | Deskripsi |
|---|---|---|
| GET | `/suppliers` | List suppliers |
| POST | `/suppliers` | Create supplier |
| GET | `/suppliers/{id}` | Get supplier + analytics |
| PUT | `/suppliers/{id}` | Update supplier |
| DELETE | `/suppliers/{id}` | Soft delete supplier |
| GET | `/products` | List produk/bahan baku |
| POST | `/products` | Create product |
| GET | `/products/{id}` | Get product |
| PUT | `/products/{id}` | Update product |
| DELETE | `/products/{id}` | Delete product |
| GET | `/units` | List satuan |
| POST | `/units` | Create satuan |
| GET | `/supplier-prices` | List harga supplier |

#### Purchase Request
| Method | Path | Deskripsi |
|---|---|---|
| GET | `/pr` | List PR |
| POST | `/pr` | Create PR |
| GET | `/pr/{id}` | Get PR |
| PUT | `/pr/{id}` | Update PR |
| POST | `/pr/{id}/submit` | Submit PR |
| POST | `/pr/{id}/approve` | Approve/reject PR |

#### Purchase Order
| Method | Path | Deskripsi |
|---|---|---|
| GET | `/po` | List PO |
| POST | `/po` | Create PO |
| GET | `/po/{id}` | Get PO |
| PUT | `/po/{id}` | Update PO |
| DELETE | `/po/{id}` | Cancel PO |
| POST | `/po/{id}/approve` | Approve PO |
| POST | `/po/{id}/send` | Send PO ke supplier |
| POST | `/po/{id}/receive` | Mark PO received |

#### Warehouse & QC
| Method | Path | Deskripsi |
|---|---|---|
| GET | `/grn` | List Goods Receipt |
| GET | `/grn/{id}` | Get GRN |
| GET | `/delivery` | List deliveries |
| POST | `/delivery` | Create delivery |
| POST | `/delivery/{id}/arrive` | Mark arrived |
| GET | `/qc` | List QC inspections |
| POST | `/qc` | Create QC inspection |
| GET | `/return` | List returns |
| POST | `/return` | Create return |
| GET | `/return/{id}` | Get return |
| PUT | `/return/{id}` | Update return |

#### Inventory & Reports
| Method | Path | Deskripsi |
|---|---|---|
| GET | `/inventory` | List inventory |
| GET | `/inventory/movements` | List movements |
| POST | `/inventory/adjustment` | Adjust stock |
| GET | `/cogs/product/{id}` | Get COGS produk |
| POST | `/cogs/additional-cost` | Allocate biaya tambahan |
| GET | `/reports/inventory-valuation` | Inventory valuation |
| GET | `/reports/po-summary` | PO summary report |
| GET | `/reports/supplier-performance` | Supplier performance |

## API Spec (OpenAPI 3.0)

Swagger UI: `/api/purchasing/docs`

Raw spec: `/api/purchasing/docs/spec`

## Postman Collection

Import file berikut ke Postman:

```
docs/purchasing/postman/ArkivOS-Purchasing.postman_collection.json
docs/purchasing/postman/ArkivOS-Purchasing.postman_environment.json
```

Set `{{baseUrl}}` ke URL Supabase Edge Function atau localhost.
Set `{{access_token}}` setelah login.

## Database Schema

Tabel utama:
- `suppliers` — Master data supplier/vendor
- `products` — Master data produk/bahan baku
- `units` — Master data satuan
- `purchase_requests` — Purchase Request header
- `pr_items` — Purchase Request items
- `purchase_orders` — Purchase Order header
- `po_items` — Purchase Order items
- `deliveries` — Data pengiriman supplier
- `grn` — Goods Receipt Note
- `gr_items` — GRN items
- `qc_inspections` — QC inspection records
- `qc_items` — QC inspection items
- `inventory` — Inventory stock
- `inventory_movements` — Stock movement history
- `returns` — Return requests
- `return_items` — Return items
- `cogs_records` — COGS records
- `additional_costs` — Biaya tambahan per PO

## Error Codes

| HTTP | Deskripsi |
|---|---|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request — validasi gagal |
| 401 | Unauthorized — token tidak valid |
| 403 | Forbidden — role tidak punya akses |
| 404 | Not Found — resource tidak ditemukan |
| 409 | Conflict — duplicate atau constraint violation |
| 500 | Server Error |

## Support

Contact: WIT.ID Development Team
