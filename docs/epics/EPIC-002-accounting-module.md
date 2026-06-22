---
epic: EPIC-002
title: Accounting Module — Semua Fitur
status: backlog
priority: P1
area: Accounting
created: 2026-06-22
---

# EPIC-002 — Accounting Module

## Latar Belakang

Modul Accounting sepenuhnya stub. Semua halaman menampilkan "Coming Soon".
Konfigurasi `ACCOUNTING_FEATURES` di kode sudah mendefinisikan 9 fitur yang
direncanakan.

## Fitur yang Dibutuhkan

### 2.1 Chart of Accounts (CoA) — PRASYARAT
- [ ] CRUD akun dengan hierarki parent–child
- [ ] Tipe: Asset, Liability, Equity, Revenue, Expense
- [ ] Status aktif/nonaktif
- [ ] Guard: tidak bisa hapus akun yang sudah punya jurnal

### 2.2 General Journal (Jurnal Umum)
- [ ] Form: tanggal, nomor jurnal (auto), deskripsi, baris debit/kredit
- [ ] Validasi: total debit = total kredit
- [ ] Status: draft → posted
- [ ] Locked setelah posted; buat reversal entry untuk koreksi
- [ ] Role: `accounting`

### 2.3 General Ledger (Buku Besar)
- [ ] Filter per akun, per periode
- [ ] Kolom: tanggal, deskripsi, debit, kredit, saldo berjalan
- [ ] Sumber: POS, Purchasing, Payroll + jurnal manual
- [ ] Export PDF/CSV

### 2.4 Release Payment (Rilis Pembayaran Hutang)
- [ ] Daftar PO sudah GRN & belum lunas
- [ ] Form: pilih PO, jumlah bayar, metode, no. rekening, upload bukti
- [ ] Status hutang: outstanding → partial → paid
- [ ] Auto-generate jurnal: Debit hutang dagang, Kredit kas/bank
- [ ] Role: `finance`, `accounting`

### 2.5 Bank Reconciliation
- [ ] Import rekening koran (CSV/Excel)
- [ ] Matching otomatis by nominal & tanggal
- [ ] Tandai match/belum match
- [ ] Laporan rekonsiliasi dengan selisih

### 2.6 Cash Count
- [ ] Input denominasi uang fisik (100rb, 50rb, dst.)
- [ ] Hitung total fisik vs saldo sistem
- [ ] Catat selisih (over/short) + alasan

### 2.7 Close Period
- [ ] Pilih bulan yang akan ditutup
- [ ] Validasi: semua jurnal posted, tidak ada draft
- [ ] Lock transaksi periode tersebut
- [ ] Generate opening balance periode berikutnya
- [ ] Role: `admin`, `accounting`

### 2.8 GL Reconciliation & Memorial Journal
- [ ] GL Reconciliation: rekonsiliasi saldo antar akun terkait
- [ ] Memorial Journal: jurnal penyesuaian periode (akrual, depresiasi)

## Catatan Teknis

- **Urutan wajib**: CoA → General Journal → General Ledger → fitur lain
- Semua tabel accounting baru harus punya RLS policy
- Estimasi total: ~3–4 minggu

## Task Groups

### 0. DB Schema: Chart of Accounts
- [ ] Tabel `accounts` (id, code, name, type, parent_id, is_active)
- [ ] Tabel `journal_entries` + `journal_lines`
- [ ] RLS policies

### 1. CoA UI
### 2. General Journal UI
### 3. General Ledger UI
### 4. Release Payment UI
### 5. Bank Reconciliation UI
### 6. Cash Count UI
### 7. Close Period UI

## Automation Log

| Tanggal | Agent | Aksi | Hasil |
| --- | --- | --- | --- |
| 2026-06-22 | Claude Code | Create epic file from PRD | done |
