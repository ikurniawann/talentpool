# Audit Database Production — Arkiv OS

**Tanggal:** 10 Juni 2026
**Project Supabase:** `jhmmhpbxiygpznhpaspy` (PostgreSQL 17.6)
**Metode:** Introspeksi read-only via Session pooler (`pg`), dibandingkan dengan referensi `.rpc()` di codebase.
**Sifat:** Tidak ada operasi tulis. Murni inspeksi `pg_proc`, `pg_class`, `pg_policies`, `information_schema`.

---

## 1. Audit RPC (kode → DB)

11 nama RPC dipanggil di kode; **6 ada, 5 hilang**.

| RPC | DB | Pemanggil | Status |
|-----|-----|-----------|--------|
| `update_ark_coin_balance` | ✅ ada | pos/orders, split-pay, table-order | **Live & dipakai** (validasi Loop 2) |
| `generate_order_number` | ✅ ada | pos orders | Live |
| `generate_shift_number` | ✅ ada | pos shift | Live |
| `pos_cancel_split` | ✅ ada | split bill | Live |
| `pos_get_order_splits` | ✅ ada | split bill | Live |
| `promote_candidate_to_employee` | ✅ ada | hris promote | Live |
| `add_xp_to_user` | ❌ hilang | `src/lib/xp.ts` | Dead code |
| `claim_challenge_reward` | ❌ hilang | `src/lib/xp.ts` | Dead code |
| `get_user_rank` | ❌ hilang | `src/lib/xp.ts` | Dead code |
| `redeem_reward` | ❌ hilang | `src/lib/xp.ts` | Dead code |
| `unlock_badge` | ❌ hilang | `src/lib/xp.ts` | Dead code |

### Kesimpulan RPC
- **Semua 5 RPC yang hilang hanya dipanggil oleh `src/lib/xp.ts`**, dan file itu **tidak di-import di mana pun** (export `XPService`/`xpService` tidak direferensikan). → **Bukan bug runtime**; ini implementasi XP/loyalty lama yang ditinggalkan. Jalur loyalty yang live memakai `src/lib/crm/loyalty-engine.ts` (`awardCrmXpForPosOrder`).
- **Rekomendasi:** hapus `src/lib/xp.ts` (dead code) — atau, jika fitur XP/badge/challenge memang akan diaktifkan, 5 RPC tersebut harus dibuat dulu. Saat ini ia hanya menambah kebingungan dan permukaan referensi yang salah.

---

## 2. Audit RLS (Row Level Security) — 135 tabel `public`

| Kategori | Jumlah | Arti |
|----------|--------|------|
| RLS **nonaktif** total | **0** | Bagus — semua tabel mengaktifkan RLS |
| RLS aktif **tanpa policy** | **44** | Deny-all untuk anon/authenticated; **hanya service-role yang bisa akses** (service-role bypass RLS) |
| RLS aktif **dengan policy** | **91** | Terlindungi per-baris sesuai policy |

### 44 tabel RLS-aktif-tanpa-policy (hanya tembus via service-role)
```
activity_logs, bahan_baku, bom, cogs_additional_costs, finished_goods_inventory,
goods_receipts, gr_items, inventory, inventory_movements, po_details, po_items,
pos_cashier_shifts, pos_categories, pos_customer_vouchers, pos_customers,
pos_inventory_settings, pos_kds_orders, pos_kds_stations, pos_modifier_groups,
pos_modifiers, pos_order_items, pos_order_status_history, pos_orders,
pos_print_jobs, pos_product_modifiers, pos_product_variants, pos_products,
pos_recipes, pos_reservations, pos_shift_transactions, pos_tables, pos_vouchers,
pos_wallet_transactions, pos_xp_config, pos_xp_transactions, production_batches,
production_order_materials, production_orders, produk, purchase_order_payment_terms,
qc_inspections, returns, satuan, vendor_payments
```

### Implikasi keamanan (KRUSIAL)
- Untuk 44 tabel ini, **RLS tidak memberi proteksi row-level yang berguna** — karena aplikasi mengaksesnya lewat **service-role client** (`createServiceClient`/`createAdminClient`) yang **mem-bypass RLS sepenuhnya**.
- Artinya: **satu-satunya lapisan keamanan untuk data POS, customer, order, inventory, vendor payment, dll. adalah auth di level aplikasi** (middleware + `requireApiRole` di route).
- Ini **memvalidasi pekerjaan Loop 1**: memperbaiki konflik middleware (agar `/api/*` benar-benar butuh login) dan menambah `requireApiRole` pada mutasi sensitif adalah **garis pertahanan sebenarnya** — bukan RLS. Route tanpa auth yang menyentuh 44 tabel ini = paparan data nyata (kini dimitigasi oleh middleware yang memaksa login; role-level masih perlu dilengkapi).
- **Efek samping yang perlu diwaspadai:** route yang (keliru) memakai **anon key** pada 44 tabel ini akan **gagal senyap** (deny-all). Contoh: endpoint import CSV purchasing yang sempat memakai anon key (temuan QA) akan menulis ke tabel tanpa policy → kemungkinan gagal/empty. Perlu dipastikan semua akses ke 44 tabel ini lewat service-role + auth aplikasi.

---

## 3. Rekomendasi Tindak Lanjut (prioritas)

1. **[Keamanan] Lengkapi role-check pada route yang menyentuh 44 tabel no-policy.** Karena RLS tidak melindungi, setiap route yang membaca/menulis tabel-tabel ini wajib `requireApiRole` yang tepat (lanjutan Loop 1, di luar yang sudah dikerjakan).
2. **[Kebersihan] Hapus `src/lib/xp.ts`** (dead code yang mereferensikan 5 RPC tidak ada), agar tidak menyesatkan. Jika XP/badge/challenge direncanakan, buat RPC-nya lebih dulu sebagai keputusan terpisah.
3. **[Pertimbangan RLS] Putuskan strategi defense-in-depth:** apakah akan menambahkan policy untuk sebagian dari 44 tabel (agar ada proteksi berlapis selain app-auth), atau secara sadar tetap mengandalkan service-role + app-auth. Untuk data finansial (vendor_payments, pos_wallet_transactions) berlapis lebih aman.
4. **[Loop 2] Lanjut integritas transaksi** setelah keputusan di atas — topup atomik (`pos_topup_ark_coin`), dan migrasi alur POS/CRM ke RPC transaksional.

---

## Lampiran — Metrik

```
RPC dipakai kode      : 11  (6 ada, 5 hilang — semua di dead code xp.ts)
Tabel public          : 135
  RLS nonaktif         : 0
  RLS aktif tanpa policy: 44  (hanya tembus service-role)
  RLS aktif + policy   : 91
Koneksi               : Session pooler (aws-1-ap-northeast-2), PG 17.6
```
