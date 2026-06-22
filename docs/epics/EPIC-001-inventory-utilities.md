---
epic: EPIC-001
title: Inventory — Halaman Utility yang Belum Berjalan
status: backlog
priority: P1
area: Inventory
created: 2026-06-22
---

# EPIC-001 — Inventory: Halaman Utility

## Latar Belakang

Modul Inventory sudah memiliki core logic (tracking stok, low-stock alert,
movement history), tetapi 4 halaman utility masih menggunakan placeholder
"Coming Soon":

| Path | Fungsi |
| --- | --- |
| `/dashboard/inventory/adjustment` | Stok opname & koreksi |
| `/dashboard/inventory/transfers` | Transfer antar gudang/area |
| `/dashboard/inventory/scrap` | Pencatatan sisa/waste |
| `/dashboard/inventory/stock` | Stock card (audit trail) |

## Acceptance Criteria

### 1.1 Stock Adjustment (Stok Opname)
- [ ] Form: pilih material, qty fisik, alasan adjustment
- [ ] Sistem hitung selisih (qty fisik − qty sistem)
- [ ] Buat `inventory_movements` record bertipe `adjustment`
- [ ] Update `quantity_on_hand` di tabel `inventory`
- [ ] History adjustment dengan filter tanggal & material
- [ ] Role: `warehouse_admin`, `admin`

### 1.2 Stock Transfer
- [ ] Form: material, qty, gudang asal, gudang tujuan
- [ ] Validasi qty ≤ stok gudang asal
- [ ] Dua movement records: `transfer_out` + `transfer_in`
- [ ] Status: pending → confirmed → completed
- [ ] Role: `warehouse_admin`

### 1.3 Scrap / Waste Recording
- [ ] Form: material, qty scrap, alasan (expired/damaged/spillage/other)
- [ ] Movement `type = 'scrap'`, kurangi `quantity_on_hand`
- [ ] Laporan scrap: total per material per periode
- [ ] Role: `warehouse_admin`, `purchasing_admin`

### 1.4 Stock Card (Audit Trail)
- [ ] Filter: material, tanggal dari–sampai, tipe movement
- [ ] Kolom: tanggal, tipe, qty masuk, qty keluar, saldo berjalan
- [ ] Export CSV
- [ ] Read-only, semua role bisa akses

## Catatan Teknis

- Tabel yang ada: `inventory`, `inventory_movements` (sudah ada tipe kolom)
- Tambah movement types: `adjustment`, `scrap`, `transfer_out`, `transfer_in`
- Estimasi: ~1 minggu

## Task Groups

### 1. Adjustment Page
- [ ] UI form + validation
- [ ] API route `POST /api/inventory/adjustment`
- [ ] DB: insert movement + update qty

### 2. Transfer Page
- [ ] UI form + status flow
- [ ] API route `POST /api/inventory/transfer`
- [ ] DB: dua movement + status tracking

### 3. Scrap Page
- [ ] UI form + laporan
- [ ] API route `POST /api/inventory/scrap`

### 4. Stock Card Page
- [ ] UI tabel dengan filter & running balance
- [ ] Export CSV

## Automation Log

| Tanggal | Agent | Aksi | Hasil |
| --- | --- | --- | --- |
| 2026-06-22 | Claude Code | Create epic file from PRD | done |
