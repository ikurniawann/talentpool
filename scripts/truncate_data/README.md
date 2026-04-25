# Script Truncate Data Purchasing

Script untuk mengosongkan data dari database Purchasing module dengan urutan yang benar berdasarkan foreign key dependencies.

## ⚠️ PERINGATAN

Script ini akan **MENGHAPUS SEMUA DATA** dari tabel. Pastikan:
- ✅ Backup database sudah dilakukan
- ✅ Script dijalankan di environment yang benar (dev/staging, BUKAN production)
- ✅ Sudah ada konfirmasi dari tim sebelum menjalankan

## Struktur File

```
truncate_data/
├── 00_truncate_all.sql          # Master script - hapus SEMUA data
├── 01_truncate_returns.sql      # Purchase Returns saja
├── 02_truncate_inventory.sql    # Inventory saja
├── 03_truncate_qc.sql           # QC Inspections saja
├── 04_truncate_grn.sql          # GRN saja
├── 05_truncate_delivery.sql     # Delivery saja
├── 06_truncate_po.sql           # Purchase Orders saja
├── 07_truncate_price_list.sql   # Supplier Price List saja
├── 08_truncate_bom.sql          # BOM saja
├── 09_truncate_produk.sql       # Produk saja
├── 10_truncate_bahan_baku.sql   # Bahan Baku saja
├── 11_truncate_supplier.sql     # Supplier saja
├── 12_truncate_satuan.sql       # Satuan (Units) saja
└── README.md                    # Dokumentasi ini
```

## Urutan Dependencies

```
satuan (12) ← bahan_baku (10) ← produk (9) ← bom (8)
                          ↓
suppliers (11) ← supplier_price_lists (7)
                          ↓
purchase_orders (6) → deliveries (5) → grn (4) → qc (3) → returns (1)
                          ↓                    ↓
                    inventory (2)         inventory_movements (2)
```

## Cara Menggunakan

### Opsi 1: Hapus SEMUA Data

```bash
# Via Supabase CLI
supabase db execute --file scripts/truncate_data/00_truncate_all.sql

# Via psql langsung
psql -h <host> -U postgres -d <database> -f scripts/truncate_data/00_truncate_all.sql
```

### Opsi 2: Hapus Data Tertentu Saja

Contoh: Hanya hapus Purchase Orders:

```bash
supabase db execute --file scripts/truncate_data/06_truncate_po.sql
```

## Verifikasi

Setiap script akan menampilkan jumlah baris setelah truncate. Jika semua berhasil, semua `row_count` harus `0`.

## Rollback

Script ini **TIDAK BISA DI-ROLLBACK** setelah commit. Jika butuh data kembali:
1. Restore dari backup database
2. Atau jalankan seed data ulang: `999_seed_data_dev.sql`

## Catatan

- Script menggunakan `TRUNCATE ... CASCADE` untuk otomatis menghapus data child
- Semua script dibungkus dalam transaction (`BEGIN; ... COMMIT;`)
- Script tidak menghapus master data seperti `users`, `brands`, `positions`, dll
