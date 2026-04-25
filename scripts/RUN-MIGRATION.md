# Quick Start - Reset Database

## Cara Termudah (Recommended)

### Step 1: Jalankan Migration (Sekali Saja)

Buka **Supabase Dashboard** → **SQL Editor**, lalu copy-paste dan run isi file:
```
supabase/migrations/20260425_create_truncate_function.sql
```

Ini akan membuat fungsi `truncate_all_data()` yang bisa dipanggil kapan saja.

### Step 2: Reset Data Kapan Saja

Setelah migration dijalankan, ada 3 cara untuk reset data:

#### Opsi A: Via Supabase Dashboard (Paling Mudah)
```sql
SELECT truncate_all_data();
```
Run di SQL Editor.

#### Opsi B: Via Terminal (Jika psql terinstall)
```bash
./scripts/reset-db.sh
```

#### Opsi C: Via API Call
```bash
curl -X POST "https://jhmmhpbxiygpznhpaspy.supabase.co/rest/v1/rpc/truncate_all_data" \
  -H "apikey: <SERVICE_ROLE_KEY>" \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
```

---

## Tanpa Migration (Manual)

Jika tidak mau buat fungsi RPC, bisa langsung run script SQL:

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Copy-paste isi file: `scripts/truncate_data/00_truncate_all.sql`
3. Run

---

## Verifikasi

Cek apakah data sudah kosong:

```sql
SELECT 'satuan' AS table_name, COUNT(*) AS row_count FROM satuan
UNION ALL SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL SELECT 'bahan_baku', COUNT(*) FROM bahan_baku
UNION ALL SELECT 'purchase_orders', COUNT(*) FROM purchase_orders;
```

Semua harus return `0`.

---

## Notes

- ⚠️ Script TIDAK menghapus users, brands, positions
- ✅ Aman untuk development/testing
- 🔄 Bisa dijalankan berulang kali
- 💾 Backup database sebelum production use
