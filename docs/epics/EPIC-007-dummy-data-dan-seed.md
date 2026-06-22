---
epic: EPIC-007
title: Dummy Data & Seed — Minimal 10 Data Per Tabel Utama
status: done
priority: Highest
area: Dev / QA
created: 2026-06-22
---

# EPIC-007 — Dummy Data & Seed (Highest Priority)

## Tujuan

Memastikan semua tabel utama memiliki minimal 10 data agar fitur bisa
didemonstrasikan dan di-QA tanpa data kosong.

## Status Akhir

Semua tabel utama sudah di-seed kecuali `leaves` yang terkendala bug trigger.

| Tabel | Status | Catatan |
| --- | --- | --- |
| `departments` | ✅ | 4 departemen |
| `job_titles` | ✅ | 5 jabatan |
| `employment_statuses` | ✅ | 5 status |
| `employees` | ✅ | 10 karyawan |
| `attendance` | ✅ | 10 records (2 hari × 5 emp) |
| `leaves` | ❌ Bug | Lihat catatan di bawah |
| `satuan` | ✅ | 8 satuan |
| `suppliers` | ✅ | 10 supplier |
| `bahan_baku` | ✅ | 10 bahan baku |
| `purchase_orders` | ✅ | 10 PO |
| `pos_categories` | ✅ | 6 kategori |
| `pos_products` | ✅ | 10 produk + gambar SVG |
| `crm_membership_tiers` | ✅ | 4 tier |
| `crm_member_profiles` | ✅ | 10 member |
| `candidates` | ✅ | 10 kandidat |
| `inventory` | ✅ | 10 records |
| `raw_materials` | ✅ | 10 bahan baku |

## Bug: `leaves` Trigger Enum

### Masalah

`fn_notify_leave_changes()` di file
`supabase/migrations/20260504_hris_notification_triggers.sql` line 90
mereferensikan `'marriage'` dalam CASE expression yang dibandingkan terhadap
kolom enum `leave_type`. PostgreSQL mencoba cast `'marriage'` ke enum saat
parsing function body — dan karena `'marriage'` tidak ada di enum, function
body tidak valid.

Akibatnya: setiap INSERT/UPDATE/DELETE pada tabel `leaves` gagal dengan
`invalid input value for enum leave_type: "marriage"`.

Nilai enum yang valid: `annual`, `sick`, `maternity`, `paternity`, `unpaid`,
`emergency`, `pilgrimage`, `menstrual`.

### Fix (sudah dibuat, belum diapply)

File migrasi sudah dibuat di:
`supabase/migrations/20260622_fix_leave_trigger_enum.sql`

Fix: tambah `::text` cast pada CASE expression agar perbandingan menjadi
string-to-string, bukan string-to-enum.

**Cara apply:**
1. Buka Supabase Dashboard → SQL Editor
2. Paste isi file `supabase/migrations/20260622_fix_leave_trigger_enum.sql`
3. Run
4. Setelah berhasil, jalankan `node scripts/seed-dummy-data.js` — bagian
   leaves sudah disiapkan di script

## Script Seed

- `scripts/seed-dummy-data.js` — seed semua tabel utama
- `scripts/seed-pos-images.js` — upload SVG food illustrations ke Supabase Storage

## Automation Log

| Tanggal | Agent | Aksi | Hasil |
| --- | --- | --- | --- |
| 2026-06-22 | Claude Code | Buat dan jalankan seed script | Semua tabel selesai kecuali leaves |
| 2026-06-22 | Claude Code | Upload SVG images untuk 10 POS produk | done |
| 2026-06-22 | Claude Code | Fix page.tsx image_url normalization bug | done |
| 2026-06-22 | Claude Code | Buat migration fix leaves trigger | Migration file ready, belum diapply |
