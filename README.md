# Arkiv OS

Sistem ERP terintegrasi untuk Aapex Technology yang mencakup modul **Rekrutmen (Talent Pool)**, **Purchasing**, **Inventory**, **Staf & Penjadwalan**, dan **POS (Point of Sale)**.

## Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Framework | Next.js (App Router, fullstack) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Styling | Tailwind CSS v4 + shadcn/ui + Liquid Glass UI |
| State | React Hook Form + Zod + TanStack Query |
| Charts | Recharts |
| Drag & Drop | @hello-pangea/dnd |
| WhatsApp | Fonnte API |
| Email | Resend |
| Deployment | Vercel |

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

```bash
cp .env.local.example .env.local
# Isi API keys sesuai kebutuhan
```

Variabel yang dibutuhkan:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
FONNTE_API_KEY=
RESEND_API_KEY=
```

### 3. Supabase Setup

1. Buat project di [supabase.com](https://supabase.com)
2. Jalankan migration SQL di `supabase/migrations/`
3. Copy credentials ke `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/                   # Login page
│   ├── (public)/portal/                # Portal lamaran kandidat publik
│   ├── (dashboard)/dashboard/          # Protected dashboard (HRD/Admin)
│   │   ├── page.tsx                    # Overview / ringkasan
│   │   ├── candidates/                 # Manajemen kandidat
│   │   ├── pipeline/                   # Kanban pipeline rekrutmen
│   │   ├── talent-pool/               # Talent pool
│   │   ├── analytics/                  # Analitik & laporan
│   │   ├── staff/                      # Manajemen staf
│   │   │   └── sections/               # Seksi staf per outlet
│   │   ├── purchasing/                 # Modul pembelian
│   │   │   ├── pr/                     # Purchase Request
│   │   │   ├── po/                     # Purchase Order
│   │   │   ├── grn/                    # Goods Receipt Note
│   │   │   ├── suppliers/              # Manajemen supplier
│   │   │   ├── products/               # Produk purchasing
│   │   │   ├── price-list/             # Daftar harga
│   │   │   ├── returns/                # Retur barang
│   │   │   ├── delivery/               # Pengiriman
│   │   │   ├── qc/                     # Quality Control
│   │   │   └── reports/                # Laporan purchasing
│   │   ├── inventory/                  # Modul inventory
│   │   │   ├── raw-materials/          # Bahan baku
│   │   │   ├── units/                  # Satuan
│   │   │   └── low-stock/              # Peringatan stok rendah
│   │   └── settings/                   # Pengaturan brand & posisi
│   ├── pos/                            # POS (Point of Sale)
│   │   ├── dashboard/                  # Dashboard kasir
│   │   ├── orders/                     # Manajemen pesanan
│   │   ├── products/                   # Produk POS
│   │   ├── customers/                  # Data pelanggan
│   │   ├── reservations/               # Reservasi
│   │   └── topup/                      # Top-up saldo
│   └── api/                            # REST API endpoints
│       ├── candidates/                 # CRUD kandidat
│       ├── positions/                  # CRUD posisi
│       ├── brands/                     # CRUD outlet/brand
│       ├── interviews/                 # CRUD interview
│       ├── staff/                      # CRUD staf
│       ├── staff-schedules/            # Jadwal staf
│       ├── staff-sections/             # Seksi staf
│       ├── purchasing/                 # API purchasing
│       ├── inventory/                  # API inventory
│       ├── pos/                        # API POS
│       ├── portal/                     # API portal publik
│       └── notifications/send/         # Kirim WA/Email
├── components/
│   ├── ui/                             # shadcn/ui components
│   └── sidebar-client.tsx              # Sidebar navigasi utama
├── lib/
│   ├── supabase/                       # Supabase clients (browser/server/middleware)
│   ├── fonnte/                         # Fonnte WhatsApp integration
│   ├── resend/                         # Resend email integration
│   └── utils/                          # Utility functions
└── types/
    └── index.ts                        # TypeScript types
```

## User Roles

| Role | Akses |
|------|-------|
| HRD | Full access: kandidat, pipeline, talent pool, staf, settings, notifikasi |
| Purchasing | Akses modul pembelian: PR, PO, GRN, supplier, produk, laporan |
| Hiring Manager | Lihat & update kandidat divisinya, input interview scorecard |
| Kasir / POS | Akses POS: pesanan, produk, pelanggan, reservasi |
| Direksi | Read-only: analytics dashboard |

## API Endpoints

### Rekrutmen

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/candidates` | List kandidat (filter: status, brand_id, search) |
| POST | `/api/candidates` | Tambah kandidat baru |
| GET | `/api/candidates/[id]` | Detail kandidat |
| PUT | `/api/candidates/[id]` | Update kandidat |
| DELETE | `/api/candidates/[id]` | Hapus kandidat |
| GET | `/api/positions` | List posisi |
| POST | `/api/positions` | Tambah posisi |
| GET | `/api/brands` | List outlet/brand |
| POST | `/api/brands` | Tambah outlet |
| GET | `/api/interviews` | List interview |
| POST | `/api/interviews` | Buat interview (auto update status kandidat) |
| POST | `/api/notifications/send` | Kirim WhatsApp / Email ke kandidat |

### Staf

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/staff` | List staf |
| POST | `/api/staff` | Tambah staf |
| PUT | `/api/staff/[id]` | Update staf |
| GET | `/api/staff-schedules` | List jadwal staf |
| POST | `/api/staff-schedules` | Buat jadwal |
| GET | `/api/staff-sections` | List seksi staf |

### Purchasing

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/purchasing/pr` | Purchase Request |
| GET/POST | `/api/purchasing/po` | Purchase Order |
| GET/POST | `/api/purchasing/grn` | Goods Receipt Note |
| GET/POST | `/api/purchasing/suppliers` | Supplier |
| GET/POST | `/api/purchasing/products` | Produk |

### Inventory

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET/POST | `/api/inventory` | Manajemen inventory |

## Database Schema

- `brands` — Outlet / subsidiary
- `positions` — Job titles per brand
- `users` — User profiles (extends auth.users)
- `candidates` — Data kandidat rekrutmen
- `interviews` — Rekaman interview dengan scorecard (JSONB)
- `notifications_log` — Riwayat notifikasi WA/email
- `staff` — Data staf/karyawan
- `staff_schedules` — Jadwal kerja staf
- `sections` — Seksi/divisi per outlet
- `staff_sections` — Relasi staf ↔ seksi
- `purchase_requests` — Data Purchase Request
- `purchase_orders` — Data Purchase Order
- `goods_receipt_notes` — Data penerimaan barang
- `suppliers` — Data supplier
- `inventory_items` — Item inventory

## UI / Design

- **Liquid Glass Effect**: Semua card dan komponen menggunakan efek kaca transparan (Apple-style) dengan `backdrop-filter: blur` dan latar gradasi
- **Sidebar**: Dark gray (`#1c1c1e`) dengan aksen pink untuk navigasi aktif
- **Tabel**: Garis tipis abu-abu (`rgba(209,213,219,0.5)`) agar tidak terlalu kontras
- **Dropdown**: Semua Select dropdown menampilkan nama (bukan ID) baik saat load awal maupun setelah dipilih

## Integrasi

- [x] Supabase Auth (email/password)
- [x] Supabase Database (PostgreSQL)
- [x] Fonnte WhatsApp API
- [x] Resend Email API
- [ ] API integration ke Talenta by Mekari (Absensi & Payroll)
- [ ] CV upload via Supabase Storage
