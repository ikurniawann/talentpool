# Reset Database - Purchasing Module

Panduan untuk mengosongkan semua data purchasing dari database.

## ⚠️ PERINGATAN

Script ini akan **MENGHAPUS SEMUA DATA** dari tabel purchasing. Pastikan:
- ✅ Backup database sudah dilakukan
- ✅ Dijalankan di environment yang benar (dev/staging, BUKAN production)
- ✅ Sudah ada konfirmasi sebelum menjalankan

## Metode 1: Script Otomatis (Recommended)

### Prerequisites
- PostgreSQL CLI (`psql`) terinstall
- `.env.local` sudah dikonfigurasi dengan Supabase credentials

### Cara Menggunakan

```bash
# Dari root folder project
./scripts/reset-db.sh
```

Script akan:
1. Membaca credentials dari `.env.local`
2. Menampilkan warning dan meminta konfirmasi
3. Menjalankan truncate script dengan urutan yang benar
4. Menampilkan hasil verifikasi

## Metode 2: Manual via Supabase Dashboard

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project kamu
3. Masuk ke **SQL Editor**
4. Copy-paste isi file `scripts/truncate_data/00_truncate_all.sql`
5. Klik **Run**

## Metode 3: Via RPC Function (Fastest)

Setelah migration dijalankan, bisa panggil via API:

```bash
curl -X POST "https://YOUR_PROJECT_ID.supabase.co/rest/v1/rpc/truncate_all_data" \
  -H "apikey: YOUR_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Atau dari SQL Editor:
```sql
SELECT truncate_all_data();
```

## Struktur File

```
scripts/
├── reset-db.sh                      # One-click reset script
├── RESET-DATABASE.md                # Dokumentasi ini
└── truncate_data/
    ├── 00_truncate_all.sql          # Master script
    ├── 01_truncate_returns.sql      # Individual scripts
    ├── 02_truncate_inventory.sql
    ├── ... (dan seterusnya)
    └── README.md                    # Detailed docs

supabase/migrations/
└── 20260425_create_truncate_function.sql  # RPC function
```

## Urutan Truncate

Data dihapus dengan urutan untuk menghindari foreign key errors:

```
1. purchase_return_items → purchase_returns
2. inventory_movements → inventory
3. qc_inspections
4. grn_items → grn
5. deliveries
6. purchase_order_items → purchase_orders
7. supplier_price_lists
8. bom
9. produk
10. bahan_baku
11. suppliers
12. satuan
```

## Data yang TIDAK Dihapus

Script ini hanya menghapus data **transaksi**. Master data berikut **TETAP UTUH**:
- ✅ Users
- ✅ Brands
- ✅ Positions
- ✅ Departments
- ✅ Sections
- ✅ Staff & Staff Schedules
- ✅ Candidates & Interviews

## Setelah Reset

Jika ingin mengisi ulang dengan seed data:

```bash
# Via Supabase CLI
supabase db execute --file supabase/migrations/999_seed_data_dev.sql

# Atau manual via SQL Editor
# Copy-paste isi file 999_seed_data_dev.sql
```

## Troubleshooting

### Error: "relation does not exist"
Beberapa tabel mungkin menggunakan nama yang berbeda. Cek file migration untuk nama tabel yang benar.

### Error: "permission denied"
Gunakan **Service Role Key** dari `.env.local`, bukan anon key.

### Data muncul lagi setelah reset
Kemungkinan seed data auto-inserted. Check apakah ada code yang auto-run migration `999_seed_data_dev.sql`.

## Support

Jika ada masalah, buka issue di GitHub atau hubungi tim development.
