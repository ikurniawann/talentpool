---
epic: EPIC-003
title: Finance Module — Semua Fitur
status: backlog
priority: P1
area: Finance
created: 2026-06-22
---

# EPIC-003 — Finance Module

## Latar Belakang

Modul Finance sepenuhnya stub. Konfigurasi `FINANCE_FEATURES` mendefinisikan
9 fitur yang direncanakan. Prioritas tertinggi: POS Settlement karena
terhubung langsung dengan POS yang sudah berjalan.

## Fitur yang Dibutuhkan

### 3.1 POS Settlement (Rekap Kas Harian) — PRIORITAS TERTINGGI
- [ ] Tarik data dari POS shift report
- [ ] Breakdown per metode pembayaran: Cash, QRIS, ARK Coin, Member Card
- [ ] Konfirmasi setoran kas ke bank/safe
- [ ] Auto-generate jurnal: Debit kas/bank, Kredit pendapatan
- [ ] Status: pending → confirmed → journalized

### 3.2 Petty Cash
- [ ] Saldo awal & batas minimal (trigger top-up alert)
- [ ] Form pengeluaran: deskripsi, nominal, kategori, upload bukti
- [ ] Approval atasan untuk pengeluaran > threshold
- [ ] Laporan penggunaan per periode
- [ ] Replenishment request dengan dokumentasi

### 3.3 Supplier Payable (Hutang Dagang)
- [ ] Daftar hutang outstanding per supplier
- [ ] Aging hutang: current / 30 / 60 / 90+ hari
- [ ] Payment history
- [ ] Integrasi dengan Release Payment (EPIC-002)
- [ ] Notifikasi jatuh tempo

### 3.4 Reimbursement
- [ ] Form: kategori, nominal, upload struk
- [ ] Approval flow: karyawan → atasan → Finance
- [ ] Status: draft → submitted → approved → paid → rejected
- [ ] Notifikasi tiap perubahan status
- [ ] Laporan per departemen

### 3.5 Cash Received & Receipt (Kwitansi)
- [ ] Form: sumber, nominal, metode, nomor referensi
- [ ] Generate kwitansi (receipt) yang bisa diprint/PDF
- [ ] Auto-generate jurnal

### 3.6 Cash Payment (Pengeluaran Kas)
- [ ] Form pengeluaran operasional non-supplier
- [ ] Kategori pengeluaran
- [ ] Auto-generate jurnal

### 3.7 Customer Receivable (Piutang)
- [ ] Tracking piutang dari transaksi kredit
- [ ] Aging piutang
- [ ] Collection reminder

### 3.8 Disbursement
- [ ] Pencairan ke karyawan/vendor
- [ ] Approval flow
- [ ] Rekap disbursement per periode

## Catatan Teknis

- POS Settlement butuh integrasi dengan `pos_shifts` dan `pos_transactions`
- Reimbursement butuh tabel baru + RLS
- Estimasi: 3.1 saja ~3 hari; full module ~2–3 minggu

## Task Groups

### 0. DB Schema (Finance tables)
- [ ] `finance_settlements`, `petty_cash_entries`, `reimbursements`
- [ ] `supplier_payables`, `receipts`, `disbursements`
- [ ] RLS policies

### 1. POS Settlement (sprint 1)
### 2. Petty Cash (sprint 2)
### 3. Supplier Payable (sprint 2)
### 4. Reimbursement (sprint 3)
### 5. Cash Received & Receipt (sprint 3)
### 6. Cash Payment, Receivable, Disbursement (sprint 4)

## Automation Log

| Tanggal | Agent | Aksi | Hasil |
| --- | --- | --- | --- |
| 2026-06-22 | Claude Code | Create epic file from PRD | done |
