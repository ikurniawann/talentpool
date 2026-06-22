# PRD — Arkiv OS: Fitur Belum Berjalan

**Dokumen**: Product Requirements Document  
**Tanggal**: 2026-06-22  
**Versi**: 1.0  
**Status**: Draft

---

## Konteks Sistem

Arkiv OS adalah sistem ERP berbasis Next.js 16 + Supabase untuk bisnis F&B/lifestyle.
Sistem sudah memiliki 7 modul berjalan penuh (HRIS, POS, Purchasing, CRM, Rekrutmen,
Table Ordering, Photobooth). PRD ini hanya mencakup fitur yang **belum berjalan**.

---

## Rangkuman Status

| Modul | Status | Keterangan |
| --- | --- | --- |
| HRIS | ✅ Berjalan | - |
| POS F&B | ✅ Berjalan | Topup Xendit belum |
| Purchasing & Produksi | ✅ Berjalan | - |
| CRM / Loyalty | ✅ Berjalan | Fase 4 belum |
| Rekrutmen | ✅ Berjalan | - |
| Table Self-Service | ✅ Berjalan | - |
| Photobooth | ✅ Berjalan | - |
| Inventory (partial) | ⚠️ Parsial | 4 halaman stub |
| Accounting | ❌ Belum | Semua stub |
| Finance | ❌ Belum | Semua stub |
| Notifikasi (Email/WA) | ❌ Belum | TODO di banyak modul |
| Xendit QRIS Topup | ❌ Belum | TODO di POS |

---

## EPIC-001 — Inventory: Halaman yang Belum Berjalan

**Priority**: P1  
**Area**: Inventory  
**Estimasi**: Medium (4 halaman dengan logika berbeda)

### Latar Belakang

Modul Inventory sudah memiliki core logic (tracking stok, low-stock alert, movement
history), namun 4 halaman utility masih menggunakan placeholder "Coming Soon":

- `/dashboard/inventory/adjustment` — Stok opname & koreksi
- `/dashboard/inventory/transfers` — Transfer antar gudang
- `/dashboard/inventory/scrap` — Pencatatan sisa/waste
- `/dashboard/inventory/stock` — Stock card (audit trail pergerakan)

Modul Purchasing dan Produksi sudah menggerakkan stok secara otomatis melalui GRN
dan production orders. Halaman-halaman ini dibutuhkan untuk koreksi manual, waste
management, dan auditability.

### Fitur yang Dibutuhkan

#### 1.1 Stock Adjustment (Stok Opname)

**Tujuan**: Operator gudang bisa merekonsiliasi stok fisik vs sistem.

**Acceptance Criteria**:
- Form input: pilih material, input qty fisik, alasan adjustment
- Sistem menghitung selisih (qty fisik - qty sistem)
- Buat inventory movement record bertipe `adjustment`
- Update `quantity_on_hand` di tabel inventory
- Tampilkan history adjustment dengan filter tanggal & material
- Role: `warehouse_admin` dan `admin`

**Data**: Tabel `inventory_movements` (sudah ada), tambah `type = 'adjustment'`

#### 1.2 Stock Transfer

**Tujuan**: Transfer stok antar lokasi/gudang (jika multi-lokasi).

**Acceptance Criteria**:
- Form: pilih material, qty, gudang asal, gudang tujuan
- Validasi: qty transfer ≤ stok di gudang asal
- Buat dua movement records: `transfer_out` dan `transfer_in`
- Status transfer: pending → confirmed → completed
- Role: `warehouse_admin`

**Catatan**: Jika saat ini single-warehouse, bisa disederhanakan menjadi
transfer antar area/station (misal: gudang utama → bar, bakery, dll).

#### 1.3 Scrap / Waste Recording

**Tujuan**: Catat bahan baku yang terbuang/rusak agar HPP akurat.

**Acceptance Criteria**:
- Form: pilih material, qty scrap, alasan (expired / damaged / spillage / other)
- Buat movement `type = 'scrap'`
- Kurangi `quantity_on_hand`
- Laporan scrap: total waste per material per periode
- Role: `warehouse_admin`, `purchasing_admin`

#### 1.4 Stock Card (Audit Trail)

**Tujuan**: Lihat riwayat lengkap pergerakan stok per material.

**Acceptance Criteria**:
- Filter: material, tanggal dari-sampai, tipe movement
- Tampilkan: tanggal, tipe (GRN / produksi / adjustment / scrap / transfer),
  qty masuk, qty keluar, saldo berjalan
- Export CSV
- Read-only view, semua role bisa akses

---

## EPIC-002 — Accounting Module

**Priority**: P1  
**Area**: Accounting  
**Estimasi**: Large (9 sub-fitur, butuh desain jurnal akuntansi)

### Latar Belakang

Modul Accounting sepenuhnya stub. Dari konfigurasi `ACCOUNTING_FEATURES` yang sudah
ada di kode, 9 fitur direncanakan:

1. Release Payment
2. Bank Reconciliation
3. Cash Count
4. GL Reconciliation
5. General Journal
6. General Ledger
7. Memorial Journal
8. Close Period — Stock
9. Close Period

### Fitur yang Dibutuhkan

#### 2.1 Chart of Accounts (CoA)

**Prasyarat** sebelum semua fitur lain: master akun (nomor akun, nama, tipe:
aset/liabilitas/ekuitas/pendapatan/beban).

**Acceptance Criteria**:
- CRUD akun dengan hierarki (parent–child)
- Tipe: Asset, Liability, Equity, Revenue, Expense
- Status aktif/nonaktif
- Tidak bisa hapus akun yang sudah punya jurnal

#### 2.2 General Journal (Jurnal Umum)

**Tujuan**: Input transaksi manual debit-kredit.

**Acceptance Criteria**:
- Form: tanggal, nomor jurnal (auto), deskripsi, baris debit/kredit
- Validasi: total debit = total kredit
- Status: draft → posted
- Tidak bisa edit setelah posted (buat reversal entry)
- Role: `accounting`

#### 2.3 General Ledger (Buku Besar)

**Tujuan**: Lihat mutasi per akun dari semua sumber jurnal.

**Acceptance Criteria**:
- Filter per akun, per periode
- Tampilkan: tanggal, deskripsi, debit, kredit, saldo
- Sumber jurnal: transaksi otomatis (POS, Purchasing, Payroll) + manual
- Export PDF/CSV

#### 2.4 Release Payment (Rilis Pembayaran Hutang)

**Tujuan**: Proses pembayaran ke supplier setelah PO selesai.

**Acceptance Criteria**:
- Daftar PO yang sudah GRN dan belum lunas
- Form pembayaran: pilih PO, jumlah bayar, metode (transfer/giro/cash),
  nomor rekening supplier, bukti transfer upload
- Status hutang: outstanding → partial → paid
- Generate jurnal otomatis: Debit hutang dagang, Kredit kas/bank
- Role: `finance`, `accounting`

#### 2.5 Bank Reconciliation

**Tujuan**: Rekonsiliasi saldo buku vs rekening koran bank.

**Acceptance Criteria**:
- Import rekening koran (CSV/Excel)
- Matching otomatis berdasarkan nominal & tanggal
- Tandai transaksi yang sudah match / belum match
- Laporan rekonsiliasi dengan selisih

#### 2.6 Cash Count

**Tujuan**: Hitung kas fisik kasir/petty cash dan rekonsiliasi.

**Acceptance Criteria**:
- Input denominasi uang fisik (100rb, 50rb, dst)
- Sistem hitung total fisik
- Bandingkan dengan saldo sistem
- Catat selisih (over/short) dengan alasan

#### 2.7 Close Period

**Tujuan**: Tutup periode akuntansi agar data bulan lalu tidak bisa diedit.

**Acceptance Criteria**:
- Pilih bulan yang akan ditutup
- Validasi: semua jurnal sudah posted, tidak ada draft
- Lock transaksi untuk periode tersebut
- Generate opening balance untuk periode berikutnya
- Role: `admin`, `accounting`

---

## EPIC-003 — Finance Module

**Priority**: P1  
**Area**: Finance  
**Estimasi**: Large

### Latar Belakang

Modul Finance sepenuhnya stub. Dari konfigurasi `FINANCE_FEATURES`:

1. Cash Received (Penerimaan Kas)
2. Receipt (Kwitansi)
3. Cash Payment (Pengeluaran Kas)
4. Petty Cash
5. Supplier Payable (Hutang Supplier)
6. Customer Receivable (Piutang)
7. POS Settlement (Rekap POS harian)
8. Reimbursement
9. Disbursement

### Fitur yang Dibutuhkan

#### 3.1 POS Settlement (Rekap Kas Harian)

**Priority tertinggi di Finance** — paling terhubung dengan modul yang sudah berjalan.

**Tujuan**: Rekonsiliasi pendapatan POS harian dari shift report ke jurnal keuangan.

**Acceptance Criteria**:
- Tarik data dari POS shift report
- Breakdown per metode pembayaran: Cash, QRIS, ARK Coin, Member Card
- Konfirmasi setoran kas ke bank/safe
- Generate jurnal otomatis: Debit kas/bank, Kredit pendapatan
- Status: pending → confirmed → journalized

#### 3.2 Petty Cash

**Tujuan**: Kelola kas kecil untuk pengeluaran harian operasional.

**Acceptance Criteria**:
- Saldo petty cash awal & batas minimal (trigger top-up)
- Form pengeluaran: deskripsi, nominal, kategori, upload bukti
- Approval atasan untuk pengeluaran > threshold
- Laporan penggunaan petty cash per periode
- Replenishment request dengan dokumentasi

#### 3.3 Supplier Payable (Hutang Dagang)

**Tujuan**: Tracking hutang ke supplier dari PO yang sudah diterima.

**Acceptance Criteria**:
- Daftar hutang outstanding per supplier
- Aging hutang (current / 30 days / 60 days / 90+ days)
- Payment history
- Terintegrasi dengan Release Payment (Accounting)
- Notifikasi jatuh tempo

#### 3.4 Reimbursement

**Tujuan**: Karyawan submit klaim pengeluaran pribadi untuk diganti perusahaan.

**Acceptance Criteria**:
- Form submission: karyawan pilih kategori, input nominal, upload struk
- Approval: atasan langsung → Finance
- Status: draft → submitted → approved → paid → rejected
- Notifikasi tiap perubahan status
- Laporan reimbursement per departemen

#### 3.5 Cash Received & Receipt

**Tujuan**: Catat penerimaan kas non-POS (misal: deposit event, sponsorship).

**Acceptance Criteria**:
- Form: sumber, nominal, metode, nomor referensi
- Generate kwitansi (receipt) yang bisa diprint/PDF
- Generate jurnal otomatis

---

## EPIC-004 — Notifikasi Email & WhatsApp

**Priority**: P2  
**Area**: Cross-module  
**Estimasi**: Medium

### Latar Belakang

Banyak TODO notifikasi ditemukan di kode:

| File | Trigger |
| --- | --- |
| `api/hris/leaves/approve/route.ts` | Persetujuan cuti → notif ke karyawan |
| `api/hris/leaves/route.ts` | Pengajuan cuti → notif ke manager |
| `api/hris/offboarding/route.ts` | Offboarding → notif ke HRD, IT, Finance, Manager |
| `api/hris/feedback-responses/route.ts` | 360 feedback selesai → notif ke HR |
| `src/components/hris/LeaveRequestForm.tsx` | Upload dokumen cuti |

### Fitur yang Dibutuhkan

#### 4.1 Notification Service Layer

**Tujuan**: Abstraksi terpusat untuk semua pengiriman notifikasi.

**Acceptance Criteria**:
- `src/lib/notifications/` service dengan provider: Email (Resend/Nodemailer) dan WhatsApp (WA Business API / Fonnte)
- Template-based: setiap event punya template pesan sendiri
- Queue-based (async) agar tidak block API response
- Log pengiriman (berhasil/gagal) ke database
- Fallback: jika WhatsApp gagal, kirim email, dan sebaliknya

#### 4.2 Event Triggers yang Dibutuhkan

| Event | Channel | Penerima |
| --- | --- | --- |
| Leave request submitted | WA + Email | Manager langsung |
| Leave approved/rejected | WA + Email | Karyawan |
| Offboarding initiated | Email | HRD, IT, Finance, Manager |
| 360 feedback completed | Email | HR |
| PO approval needed | Email | Approver |
| Low stock alert | Email | Purchasing Admin |
| Reimbursement status change | WA | Karyawan |

#### 4.3 Notification Settings

**Acceptance Criteria**:
- Per-user: aktifkan/nonaktifkan channel (email/WA)
- Admin bisa konfigurasi template pesan
- Riwayat notifikasi per user

---

## EPIC-005 — Xendit QRIS Integration (POS Topup)

**Priority**: P2  
**Area**: POS / CRM  
**Estimasi**: Small–Medium

### Latar Belakang

`/dashboard/pos/topup` dan `src/app/api/pos/topup/route.ts` sudah ada struktur-nya
tapi masih TODO untuk integrasi Xendit.

### Fitur yang Dibutuhkan

**Acceptance Criteria**:
- Generate Xendit QRIS payment untuk top-up ARK Coin
- Webhook handler untuk konfirmasi pembayaran dari Xendit
- Pada konfirmasi berhasil: kredit ARK Coin ke wallet member
- Tampilkan status top-up real-time (pending → paid → failed)
- Receipt top-up yang bisa diprint
- Sandbox testing dengan Xendit test credentials

**Integrasi**:
- `src/lib/crm/` wallet management (sudah ada)
- Xendit Node.js SDK atau REST API
- Webhook di `/api/pos/topup/webhook`

---

## EPIC-006 — CRM Fase 4: Advanced Features

**Priority**: P3  
**Area**: CRM  
**Estimasi**: Large

### Latar Belakang

CRM sudah selesai Fase 1–3. Fase 4 (Advanced) belum dimulai.

### Fitur yang Dibutuhkan

#### 6.1 Advanced Avatar System

**Tujuan**: Member bisa collect dan equip avatar dari aktivitas loyalty.

**Acceptance Criteria**:
- Avatar unlock via XP milestones atau event khusus
- Member punya inventory avatar
- Equip avatar sebagai profile picture di table ordering & member portal
- Rarity system: Common / Rare / Epic / Legendary
- Avatar showcase di member profile

#### 6.2 Member Portal (Self-Service)

**Tujuan**: Member bisa lihat poin, riwayat transaksi, dan reward mereka sendiri.

**Acceptance Criteria**:
- Login dengan nomor HP atau member card
- Dashboard: XP balance, tier, next tier progress
- Riwayat transaksi & XP earned
- Katalog reward + tombol redeem
- Avatar collection & equip
- Profil edit

#### 6.3 Campaign & Targeted Promotion

**Tujuan**: Kirim promo/XP bonus ke segment member tertentu.

**Acceptance Criteria**:
- Segmentasi: by tier, by visit frequency, by total spent, by last visit
- Buat campaign dengan bonus XP / diskon / free item
- Jadwal pengiriman (immediate atau scheduled)
- Tracking: berapa member menerima, berapa yang redeem

---

## Prioritas Implementasi

| Epic | Modul | Priority | Complexity | Effort |
| --- | --- | --- | --- | --- |
| EPIC-001 Inventory Utilities | Inventory | P1 | Low–Medium | ~1 minggu |
| EPIC-003.1 POS Settlement | Finance | P1 | Medium | ~3 hari |
| EPIC-004 Notifikasi | Cross-module | P2 | Medium | ~1 minggu |
| EPIC-005 Xendit QRIS | POS/CRM | P2 | Small | ~3 hari |
| EPIC-002 Accounting | Accounting | P1 | High | ~3–4 minggu |
| EPIC-003 Finance (full) | Finance | P1 | High | ~2–3 minggu |
| EPIC-006 CRM Fase 4 | CRM | P3 | High | ~2–3 minggu |

---

## Out of Scope (PRD ini)

- Modul yang sudah berjalan (HRIS, POS core, Purchasing, dll)
- Bug fixes pada fitur existing
- Infrastructure / DevOps
- Mobile app

---

## Catatan Teknis

- **Stack**: Next.js 16 App Router, Supabase, TypeScript, Tailwind, Vitest
- **Deprecation pending**: `src/middleware.ts` → rename ke `proxy.ts`
- **TypeScript errors**: Beberapa error di Next.js 16 routing params perlu diselesaikan sebelum build production
- **Auth**: Semua halaman baru harus menggunakan middleware auth yang sudah ada
- **RLS**: Setiap tabel baru di Supabase harus punya RLS policy sesuai role
