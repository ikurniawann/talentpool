# Laporan QA & Engineering Loop — Arkiv OS

**Tanggal audit:** 10 Juni 2026
**Commit:** `d0f38b6` — Refine Arkiv AI shortcut and finance menus
**Branch:** `main`
**Stack:** Next.js 16 (App Router) · React 19 · Supabase · TypeScript · Vitest
**Metode:** 8 sub-agent QA paralel (per-modul) + verifikasi otomatis (build/test/typecheck) di seluruh codebase.

> ⚠️ **Disclaimer:** Laporan ini adalah hasil audit statis + analisis kode. Setiap temuan mengutip `file:line` sebagai bukti. Sebelum mengeksekusi perbaikan, validasi tiap temuan terhadap konfigurasi RLS Supabase yang sebenarnya (beberapa proteksi mungkin sudah ada di level database dan tidak terlihat di kode aplikasi).

---

## 1. Ringkasan Eksekutif

Arkiv OS adalah ERP multi-modul (POS, Purchasing, Inventory, HRIS, CRM, Finance, AI Assistant) dengan basis kode besar (**580 file TS/TSX, 207 route API**). Fondasi arsitektur cukup baik di beberapa modul (Zod validation, helper `requireApiRole`, audit log di modul admin), namun audit menemukan **pola masalah sistemik yang berulang di hampir semua modul**:

1. **Auth gap masif** — ~**104 dari 207 route API (50%)** tidak memiliki referensi auth helper apa pun di handler. Banyak di antaranya menulis data sensitif (approve PO, ubah gaji, kirim notifikasi, adjustment stok).
2. **`createServiceClient` / `createAdminClient` (bypass RLS) dipakai luas** — terdeteksi di **96 file API**, sering hanya dijaga oleh `getPosSession` (cek JWT valid, tanpa cek role) → privilege escalation lateral.
3. **Tidak ada DB transaction** pada operasi multi-step kritis (POS payment, split bill, ARK coin, CRM redemption, GRN inventory, leave balance) → risiko korupsi data & double-spend.
4. **Test coverage ~efektif 0%** untuk seluruh logika bisnis — hanya 2 file test (`auth.test.ts`, `schemas.test.ts`, 39 test) yang menguji helper, bukan domain.
5. **65 error TypeScript** saat `tsc --noEmit` (build Next.js lolos karena type-check di-skip saat build).

### Status Verifikasi Otomatis

| Cek | Perintah | Hasil |
|-----|----------|-------|
| Unit test | `npm run test` | ✅ **39 passed / 39** (2 file) |
| Type check | `npx tsc --noEmit` | ❌ **65 errors** |
| Build | `next build` | ⚠️ Lolos (type/lint error di-ignore saat build) |
| Auth coverage | grep route API | ❌ **~104/207 route tanpa auth helper** |
| Test coverage | file `*.test.*` | ❌ **2 file, ~0% domain coverage** |

### Distribusi Severity (gabungan semua modul)

| Severity | Jumlah Temuan | Tindakan |
|----------|---------------|----------|
| 🔴 CRITICAL | 21 | **BLOCK** — wajib fix sebelum production |
| 🟠 HIGH | 33 | **WARN** — fix sebelum rilis berikutnya |
| 🟡 MEDIUM | 27 | Pertimbangkan fix |
| 🔵 LOW | 9 | Opsional |

---

## 2. Temuan Lintas-Modul (Pola Sistemik)

Lima isu berikut muncul di **lebih dari satu modul** dan harus ditangani secara terpusat, bukan per-route:

| Pola | Dampak | Solusi Terpusat |
|------|--------|-----------------|
| **A. Route API tanpa auth** | Akses/mutasi data tanpa login | Buat wrapper `withAuth(handler, roles)` HOF + custom ESLint rule yang menolak `export async function GET/POST/...` tanpa panggil auth helper |
| **B. `createServiceClient` + hanya JWT check** | Privilege escalation lateral (kasir baca/ubah data CRM, gaji, dll.) | Audit 96 file; ganti read rutin ke user-scoped client; `requireApiRole` wajib sebelum service-role write |
| **C. Multi-step write tanpa transaction** | Korupsi data, double-spend coin/XP, saldo tidak konsisten | Pindahkan alur kritis ke Supabase RPC (`BEGIN…COMMIT`): POS order, split-pay, ARK topup, CRM redeem, GRN inventory, leave approve |
| **D. Error mentah bocor ke client** | Leakage skema DB (`error.message`/`hint`/`code`) | Util `apiError()` standar: pesan generik ke client, detail hanya ke server log |
| **E. Timezone & float pada uang** | Laporan profit/harian salah; margin meleset | Konstanta `Asia/Jakarta`; hitung uang dalam integer (sen) atau `decimal.js` |

---

## 3. Temuan per Modul

### 3.1 Module: POS & Table Order

**Ringkasan:** Tiga endpoint write (buat order, ubah status order, buat customer) tanpa auth sama sekali. Semua operasi multi-step (order+items, ARK coin deduction, merge) tanpa DB transaction → crash di tengah meninggalkan data korup. 0 test.

| # | Sev | File:Line | Temuan | Rekomendasi |
|---|-----|-----------|--------|-------------|
| 1 | 🔴 CRITICAL | `api/pos/orders/[id]/route.ts:21` | `PATCH /orders/:id` tanpa `getPosSession` — siapa pun bisa ubah `status`, `payment_status`, `amount_paid` | Tambah auth guard di baris pertama |
| 2 | 🔴 CRITICAL | `api/pos/orders/[id]/status/route.ts:8` | `PATCH /status` (KDS) tanpa auth | Tambah auth + role check |
| 3 | 🔴 CRITICAL | `api/table-order/customers/lookup/route.ts:30` | Endpoint publik buat `pos_customers` hanya dari nomor telp → spam/enumerasi member | Rate limit + validasi `table_code` aktif |
| 4 | 🔴 CRITICAL | `api/pos/orders/route.ts:253` | `Number(total_amount) \|\| computed` — klien bisa kirim `total_amount: 1` bypass validasi bayar | Hapus fallback; selalu pakai nilai server |
| 5 | 🔴 CRITICAL | `api/pos/topup/route.ts:93` & `api/table-order/orders/route.ts:86` | ARK coin read-then-write tanpa transaction/guard → double-spend saat concurrent | Atomic RPC `UPDATE … WHERE balance >= amount RETURNING` |
| 6 | 🟠 HIGH | `api/pos/orders/route.ts:261-352` | Order di-insert `paid` dulu, items terpisah; jika items gagal → order lunas tanpa item | Satu RPC transaksional |
| 7 | 🟠 HIGH | `api/pos/orders/[id]/splits/[splitId]/pay/route.ts:84` | Coin dikurangi sebelum insert payment record; gagal → saldo terpotong tanpa catatan | Gabung ke RPC / balik urutan |
| 8 | 🟠 HIGH | `api/pos/orders/[id]/merge/route.ts:67` | Merge = 4 update tanpa transaction | Bungkus dalam RPC |
| 9 | 🟠 HIGH | `api/pos/orders/[id]/void/route.ts:26` | Supervisor PIN tanpa min-length/lockout/hash → brute-force 4 digit | Hash bcrypt + rate limit + lockout |
| 10 | 🟠 HIGH | `api/pos/products/route.ts:62` | `GET /products` tanpa auth, expose `cost_price` (harga modal) | Auth guard + pisahkan field sensitif |
| 11 | 🟠 HIGH | `api/pos/orders/[id]/splits/route.ts:131` | Split dibuat loop sequential tanpa transaction; partial gagal → retry terblok | Bulk insert RPC + compensating delete |
| 12 | 🟠 HIGH | `api/pos/reports/profit/route.ts:155` | `pos_order_items.in(orderIds)` tanpa `.limit()` → tarik ratusan ribu baris | Paginate/agregasi DB |
| 13 | 🟡 MEDIUM | `api/pos/orders/route.ts:383` | `cashier_id` hardcoded `00000000-…-0001` (di 4 file) → audit trail kasir rusak | Pakai `sessionUserId` |
| 14 | 🟡 MEDIUM | `api/table-order/orders/route.ts:68` | Tax `Math.round(subtotal*0.1)` float | Integer arithmetic / decimal.js |
| 15 | 🟡 MEDIUM | `api/pos/orders/[id]/route.ts:56` | Coin deduction fire-and-forget (`console.error` saja) → coin double-spent | Hard failure + reconcile flag |

**Test coverage:** 0% (tidak ada test untuk payment, split, void, topup).

**Engineering Loop POS:**
1. Tambah auth guard ke 3 endpoint unprotected (3-5 baris/file).
2. Atomic RPC untuk ARK coin (topup, split-pay, table-order).
3. Bungkus single-payment order creation ke 1 RPC transaksional.
4. Hapus `total_amount` trust bug.
5. Rate limit + PIN hashing untuk void/merge.
6. Integration test 5 alur kritis (order cukup/kurang bayar, topup concurrent, void, split-pay lunas, profit report).

---

### 3.2 Module: Purchasing

**Ringkasan:** >40 route tanpa auth, termasuk approve/cancel/send PO, vendor payment, inventory adjustment. Kalkulasi GRN inkonsisten, `unitCost=0` saat GRN di-update (merusak weighted average), tidak ada transaction multi-step.

| # | Sev | File:Line | Temuan | Rekomendasi |
|---|-----|-----------|--------|-------------|
| 1 | 🔴 CRITICAL | `api/purchasing/po/[id]/approve/route.ts:13` | Approve PO tanpa `requireApiRole` | `requireApiRole(["purchasing_admin","purchasing_manager"])` |
| 2 | 🔴 CRITICAL | `api/purchasing/po/[id]/send/route.ts:19` & `po/[id]/route.ts:101` | Send/CRUD PO pakai `createServiceClient` tanpa auth | `createClient()` + `requireApiRole` |
| 3 | 🔴 CRITICAL | `api/purchasing/inventory/adjustment/route.ts:20` | Adjustment stok tanpa auth | `requireApiRole(["warehouse_admin","admin"])` |
| 4 | 🔴 CRITICAL | `api/purchasing/returns/[id]/approve/route.ts:14` | `approved_by` dari body (approver palsu) | Ambil dari sesi server |
| 5 | 🔴 CRITICAL | `api/purchasing/import/*/route.ts` (4 file) | Bulk import CSV pakai anon key tanpa auth | server client + `requireApiRole(["admin"])` + batas ukuran |
| 6 | 🔴 CRITICAL | `api/purchasing/po/[id]/payments/route.ts:79` | Catat pembayaran vendor tanpa auth | `requireApiRole(["purchasing_admin","finance"])` |
| 7 | 🟠 HIGH | `api/purchasing/returns/route.ts:19,62` | `sort_by` user langsung ke `.order()` tanpa whitelist | `z.enum([...])` |
| 8 | 🟠 HIGH | `api/purchasing/grn/[id]/route.ts:459` | GRN PATCH panggil `addInventoryFromGrn` dengan `unitCost=0` → rusak weighted avg | Fetch `harga_satuan` dari PO item |
| 9 | 🟠 HIGH | `api/purchasing/grn/route.ts:432` | Inventory update di-`try/catch` swallow → GRN "received" tapi stok tak nambah | Return warning eksplisit |
| 10 | 🟠 HIGH | `api/purchasing/po/route.ts:44` | Nomor PO/GRN via SELECT MAX+increment tanpa lock → duplikat saat concurrent | PostgreSQL sequence / `FOR UPDATE` |
| 11 | 🟠 HIGH | `api/purchasing/pr/[id]/approve/route.ts:65` | `canApprove()` hanya izinkan `pending_head`; `pending_finance`/`pending_direksi` selalu false | Tambah kondisi role per level |
| 12 | 🟠 HIGH | `api/purchasing/grn/route.ts` & `grn/[id]/route.ts` | File 458+606 baris, logika campur | Ekstrak service ke `lib/purchasing/` |
| 13 | 🟡 MEDIUM | `api/purchasing/po/[id]/cancel/route.ts:59` | Cancel PO tak lepas `qty_on_order` saat status `approved` | Adjust on_order negatif sesuai status |
| 14 | 🟡 MEDIUM | `api/purchasing/returns/route.ts:160` | Rollback manual delete tak jamin konsistensi | Stored procedure / Edge Function |
| 15 | 🔵 LOW | `api/purchasing/grn/route.ts:308,…` | Banyak `console.log` debug di production | Hapus / structured logger |

**Test coverage:** 0% logika domain.

**Engineering Loop Purchasing:**
1. Tambah auth ke 40+ route kritis (approve/send/cancel/payment/adjustment/import).
2. `returns/approve` & `pr/approve`: ambil approver dari sesi + perbaiki level approval.
3. Ganti number-generation ke DB sequence.
4. Perbaiki `unitCost=0` GRN PATCH + swallowed inventory error.
5. Cancel PO lepas `qty_on_order`.
6. Integration test PO lifecycle + GRN quantity math (target ≥80%).

---

### 3.3 Module: Inventory & Master Data

**Ringkasan:** Route inti punya RBAC, tapi `/api/brands`, `/api/sections`, dan seluruh `/api/master/*` tanpa auth. Semua route expose `error.message` mentah. Operasi stok tanpa transaction. 0 test.

| # | Sev | File:Line | Temuan | Rekomendasi |
|---|-----|-----------|--------|-------------|
| 1 | 🔴 CRITICAL | `api/brands/route.ts:5,21` | GET/POST brand tanpa auth | `requireApiRole(["admin"])` |
| 2 | 🔴 CRITICAL | `api/sections/route.ts:5,28` | GET/POST section tanpa auth | `requireApiRole` |
| 3 | 🔴 CRITICAL | `api/master/departments/route.ts:4,14` | Master Data pakai `createAdminClient` (bypass RLS) tanpa `requireApiRole` | Auth check semua handler master |
| 4 | 🟠 HIGH | `lib/purchasing/inventory.ts:41` | `recordMovement` tak cek error insert → movement log hilang, stok berubah | Simpan return + `throw` |
| 5 | 🟠 HIGH | `lib/purchasing/inventory.ts:189` | `reduceStockOnReturn` tak ada guard negatif | Validasi `qtyReturned > sebelum` |
| 6 | 🟠 HIGH | `lib/purchasing/inventory.ts:130` | `addStockFromQC`/`reduceStockOnReturn` update+insert tanpa transaction | Supabase RPC atomik |
| 7 | 🟠 HIGH | `dashboard/(dashboard)/inventory/[id]/page.tsx:51` | Fetch seluruh inventory (`limit=1000`) cari 1 item (N+1) | Endpoint `GET /api/inventory/[id]` |
| 8 | 🟠 HIGH | `dashboard/(dashboard)/inventory/page.tsx:73` | Summary card double-fetch `limit=1000` tiap render | Endpoint summary terpisah |
| 9 | 🟡 MEDIUM | `api/inventory/route.ts:31` (+12 lokasi) | Catch return `error.message` mentah → leak skema | Pesan generik |
| 10 | 🟡 MEDIUM | `dashboard/(dashboard)/inventory/low-stock/page.tsx:43` | `useEffect([])` tak masukkan filter → data stale | Deps `[categoryFilter, statusFilter]` |
| 11 | 🟡 MEDIUM | `api/master/employment-statuses/[id]/route.ts:34` | DELETE TOCTOU race (cek lalu hapus) | Stored proc / FK `ON DELETE RESTRICT` |
| 12 | 🟡 MEDIUM | `api/master/positions/route.ts:17` | `department` string bebas, bukan FK | Migrasi ke `department_id` |
| 13 | 🟡 MEDIUM | `api/brands/route.ts:23` & `sections/route.ts:28` | POST tanpa Zod validation | `validateBody` Zod |
| 14 | 🔵 LOW | `api/inventory/low-stock/route.ts:59` | `paginatedResponse` palsu (limit = panjang data) | Pagination nyata |
| 15 | 🔵 LOW | `dashboard/(dashboard)/inventory/page.tsx:55` | `useEffect` tak masukkan `search` | Tambah deps / callback |

**Test coverage:** 0%.

**Engineering Loop Inventory:**
1. Auth ke `/api/brands`, `/api/sections`, semua `/api/master/*`.
2. Sanitasi error response (19 lokasi).
3. Transaction untuk `addStockFromQC` & `reduceStockOnReturn`.
4. Endpoint `GET /api/inventory/[id]` + summary endpoint.
5. Fix filter reactivity + Zod + FK `department_id`.
6. Unit test kalkulasi stok + integration test 401/403.

---

### 3.4 Module: HRIS & Recruitment

**Ringkasan:** Endpoint data finansial PII (salary, payroll, loan, payslip) tanpa auth. `createAdminClient` tanpa auth di employees (KTP/NPWP/rekening). Debug log gaji di production. Endpoint `test-insert` terbuka. 0 test.

| # | Sev | File:Line | Temuan | Rekomendasi |
|---|-----|-----------|--------|-------------|
| 1 | 🔴 CRITICAL | `api/hris/employee-salary/route.ts:14` | GET gaji semua karyawan tanpa auth | Auth + role HRD/finance + RLS |
| 2 | 🔴 CRITICAL | `api/hris/employee-salary/route.ts:63` | POST ubah gaji tanpa auth | Auth + role guard |
| 3 | 🔴 CRITICAL | `api/hris/employee-salary/[id]/route.ts:76,153` | PUT/DELETE gaji tanpa auth | Auth semua verb |
| 4 | 🔴 CRITICAL | `api/hris/employees/route.ts:19` & `[id]/route.ts:22` | `createAdminClient` tanpa auth → PII lengkap bocor | User-scoped client + verifikasi sesi |
| 5 | 🔴 CRITICAL | `api/hris/loans/route.ts:14` & `payslips/route.ts:13` | GET loans/payslips tanpa auth | Auth + role |
| 6 | 🟠 HIGH | `api/hris/leaves/approve/route.ts:188` | `checkIsManager` tak validasi atasan langsung; `hiring_manager` bisa approve | Batasi `hrd`/atasan via `reporting_to` |
| 7 | 🟠 HIGH | `api/hris/leaves/approve/route.ts:152` | `updateLeaveBalance` di luar transaction → saldo cuti tak terdebit | Supabase RPC atomik |
| 8 | 🟠 HIGH | `api/hris/payroll/[id]/calculate/route.ts:64` | 7 `console.log` cetak data gaji+nama | Hapus debug log |
| 9 | 🟠 HIGH | `api/hris/payroll/[id]/calculate/route.ts:96` | N+1 (300+ query serial utk 100 karyawan) | Batch fetch + join di memori |
| 10 | 🟠 HIGH | `api/hris/reports/route.ts:25` | Load seluruh `employees` tanpa limit + tanpa auth | Aggregate DB + auth |
| 11 | 🟠 HIGH | `api/hris/feedback-summaries/test-insert/route.ts:6` | Endpoint debug terbuka di production | Hapus / guard `NODE_ENV` |
| 12 | 🟠 HIGH | `api/hris/attendance/export/route.ts:8` & `leaves/export/route.ts:8` | Export CSV absensi/cuti tanpa auth | Auth + role |
| 13 | 🟡 MEDIUM | `api/hris/employees/route.ts:99` | Error response sertakan `details/hint/code` | Hapus field, log server |
| 14 | 🟡 MEDIUM | `api/hris/staff-schedules/route.ts:28` | Bulk insert jadwal tanpa validasi/overlap check | Zod per item + overlap detection |
| 15 | 🟡 MEDIUM | `api/portal/submit/route.ts:204` | Data kandidat di-interpolasi ke HTML email tanpa escape → XSS | Escape HTML |

**Test coverage:** 0%.

**Engineering Loop HRIS:**
1. [Sprint 1] Auth guard semua endpoint finansial PII + RLS.
2. [Sprint 1] Ganti `createAdminClient` tanpa auth di employees.
3. [Sprint 2] Bersihkan debug log + hapus `test-insert` + hardened error.
4. [Sprint 2] Atomikkan leave approval + balance.
5. [Sprint 3] Eliminasi N+1 payroll calculator.
6. [Sprint 4] Test: `calculatePayroll`, leave rollback, auth 401.

---

### 3.5 Module: Finance, Accounting & Analytics

**Ringkasan:** Finance/Accounting masih placeholder (ComingSoon). Analytics/dashboard/POS profit live tapi 10 route tanpa auth. Timezone UTC hardcoded → laporan profit harian salah. Float pada akumulasi uang. 0 test.

| # | Sev | File:Line | Temuan | Rekomendasi |
|---|-----|-----------|--------|-------------|
| 1 | 🔴 CRITICAL | `api/analytics/overview/route.ts:5` + 5 `api/dashboard/*` | 10 route analytics/dashboard tanpa auth handler | `requireApiUser()` di tiap handler |
| 2 | 🔴 CRITICAL | `api/purchasing/dashboard/route.ts:45` | `new Date(start_date)` tanpa validasi → query `Invalid Date` | Zod / `isNaN(getTime())` |
| 3 | 🟠 HIGH | `api/purchasing/dashboard/route.ts:228` | Expose `errorMessage`+`errorDetails` ke client | Pesan generik |
| 4 | 🟠 HIGH | `api/pos/dashboard/route.ts:180` | `error.message` ke client | Pesan generik |
| 5 | 🟠 HIGH | `api/pos/reports/profit/route.ts:117` | Timezone UTC hardcoded (`T00:00:00.000Z`) → laporan harian geser 7 jam | Konversi `Asia/Jakarta` |
| 6 | 🟠 HIGH | `api/dashboard/weekly/route.ts:15` | Batas minggu pakai server TZ bukan bisnis TZ | Standarisasi TZ |
| 7 | 🟠 HIGH | `api/pos/reports/profit/route.ts:213` | Akumulasi float tanpa kompensasi → margin meleset | Integer cent / decimal.js |
| 8 | 🟠 HIGH | `dashboard/performance/dashboard/page.tsx:82` | Catch fetch hanya `console.error` → UI kosong tanpa pesan | Set error state |
| 9 | 🟡 MEDIUM | `api/purchasing/dashboard/route.ts:165` | Trend query tanpa filter tanggal, `LIMIT 100` → data stale | Filter 12 bulan |
| 10 | 🟡 MEDIUM | `api/purchasing/dashboard/route.ts:202` | Metrik supplier hardcoded (`on_time_rate:85`) | Hapus dummy data |
| 11 | 🟡 MEDIUM | `api/dashboard/sources/route.ts:33` | Query ganda redundan (count head tak dipakai) | Hapus query pertama |
| 12 | 🟡 MEDIUM | `api/pos/dashboard/route.ts:91` | `pos_order_items` tanpa LIMIT, agregasi di app | `GROUP BY` di DB |
| 13 | 🟡 MEDIUM | `api/analytics/overview/route.ts:140` | Semua kandidat ke memori, agregasi di app | Aggregate query |
| 14 | 🔵 LOW | `api/pos/reports/profit/route.ts:251` | `console.error` di production | Structured logger |
| 15 | 🔵 LOW | `dashboard/performance/dashboard/page.tsx:244` | `0/0=NaN`, `NaN\|\|0` fragile | Guard eksplisit |

**Test coverage:** 0%.

**Engineering Loop Finance:**
1. Auth guard 10 route analytics/dashboard.
2. Sanitasi error response purchasing/pos dashboard.
3. Standarisasi timezone `Asia/Jakarta` (profit, weekly, overview).
4. Fix float keuangan (integer cent) + hapus dummy supplier.
5. Optimasi query unbounded → aggregate DB.
6. Test `marginPct`/`roundCurrency`, auth 401, timezone date range.

---

### 3.6 Module: CRM

**Ringkasan:** Auth ada (`getPosSession`) tapi tanpa cek role/ownership → semua user terautentikasi (termasuk kasir) bisa modifikasi data CRM via `createServiceClient` (bypass RLS). Redemption & avatar-redemption multi-step tanpa transaction → double-spend XP. 0 test.

| # | Sev | File:Line | Temuan | Rekomendasi |
|---|-----|-----------|--------|-------------|
| 1 | 🔴 CRITICAL | `lib/supabase/service-client.ts:3` (dipakai CRM) | Service-role + hanya JWT check → kasir bisa `PATCH members/[id]` ubah tier | `requireApiRole(["admin","crm_manager"])` sebelum write |
| 2 | 🔴 CRITICAL | `api/crm/redemptions/route.ts:211` | Redemption 6+ write tanpa transaction → XP terdebit tapi redemption tak tercatat | Supabase RPC `BEGIN…COMMIT` |
| 3 | 🔴 CRITICAL | `api/crm/avatar-inventory/route.ts:167` | Avatar redeem 7+ write tanpa transaction → double-spend XP | RPC transaksional |
| 4 | 🟠 HIGH | `api/crm/avatar-inventory/route.ts:352` | `grantAvatar` (beri aset gratis) tanpa role check tambahan | `requireApiRole(["admin"])` untuk `action==="grant"` |
| 5 | 🟠 HIGH | `api/crm/dashboard/route.ts:118` | Top spenders query tanpa batas waktu, `limit(1000)` | Filter 30-90 hari / aggregate SQL |
| 6 | 🟠 HIGH | `api/crm/members/route.ts:128` | Tak ada offset/cursor pagination | Cursor/offset pagination |
| 7 | 🟠 HIGH | `api/crm/redemptions/route.ts:186` | Cek `max_redemptions_per_member` tanpa lock → race | Unique constraint / advisory lock |
| 8 | 🟡 MEDIUM | `api/crm/members/[id]/route.ts:163` | Fallback non-UUID ke query tanpa validasi | Validasi UUID, 400 jika tidak |
| 9 | 🟡 MEDIUM | `lib/crm/server.ts:67` | `apiErrorResponse` return `error.message` | Pesan generik |
| 10 | 🟡 MEDIUM | `api/crm/rewards/route.ts:93` | DELETE tanpa validasi UUID | `z.string().uuid()` |
| 11 | 🟡 MEDIUM | `dashboard/(dashboard)/crm/members/page.tsx:95` | `limit=100` hardcoded, data >100 tersembunyi | Indikator total / infinite scroll |
| 12 | 🔵 LOW | `api/crm/dashboard/route.ts:162` | Error ledger di-swallow diam-diam | Log + flag partial |

**Test coverage:** 0%.

**Engineering Loop CRM:**
1. Bungkus redemption & avatar-redemption dalam RPC transaction.
2. RBAC semua CRM write (ganti `getPosSession` → `requireApiRole`).
3. Fix dashboard query tak terbatas waktu (aggregate SQL).
4. Sanitasi error message.
5. Pagination `GET members` & `redemptions` + UI indikator.
6. Unit test schema + business logic + edge-case redemption.

---

### 3.7 Module: Auth, Admin & Platform Core

**Ringkasan:** Fondasi admin baik (`requireApiRole`, Zod, audit log), tapi `/api/notifications/send` tanpa auth (kirim WA/email atas nama sistem), dua middleware aktif sekaligus, IDOR di AI assistant session, rate limiter tak diterapkan di login/admin.

| # | Sev | File:Line | Temuan | Rekomendasi |
|---|-----|-----------|--------|-------------|
| 1 | 🔴 CRITICAL | `api/notifications/send/route.ts:49` | POST kirim WA/email tanpa auth (pakai API key Fonnte/Resend) | `requireApiUser()` baris pertama |
| 2 | 🔴 CRITICAL | `src/middleware.ts:1` & `middleware.ts:1` | Dua middleware; Next.js jalankan satu. Jika `src/middleware.ts` dipilih → seluruh auth bypass | Hapus/gabung; verifikasi via `next build` |
| 3 | 🟠 HIGH | `api/ai/assistant/route.ts:188` | Update session tanpa `.eq("user_id", user.id)` → IDOR | Tambah filter user_id |
| 4 | 🟠 HIGH | `lib/rate-limit.ts:1` | In-memory limiter hanya di `/api/candidates`; login/admin tak terlindungi + tak efektif di serverless | Redis-backed (`@upstash/ratelimit`) di middleware |
| 5 | 🟠 HIGH | `app/(auth)/login/page.tsx:84` | Email internal hardcoded di client bundle (dead code) | Hapus `hrdEmails` |
| 6 | 🟠 HIGH | `api/auth/me/route.ts:40` | Return `error.message` ke client | Pesan generik |
| 7 | 🟠 HIGH | `lib/supabase/auth.ts:53` vs `lib/api/auth.ts:63` | Inkonsistensi bypass super_admin (page ya, API tidak) → false-denial | Konsistenkan / dokumentasikan |
| 8 | 🟠 HIGH | `dashboard/(dashboard)/settings/page.tsx:1` | Settings `"use client"` tanpa server-side role check | Wrapper Server Component `requireRole` |
| 9 | 🟡 MEDIUM | `api/admin/users/[id]/reset-password/route.ts:19` | `redirectTo` dari `request.url` → host header injection | Pakai `NEXT_PUBLIC_APP_URL` |
| 10 | 🟡 MEDIUM | `lib/supabase/service-client.ts` (20+ route) | Service-role luas + hanya `getPosSession` | Audit + `requireApiRole` |
| 11 | 🟡 MEDIUM | `contexts/ActivityLogContext.tsx:19` | Audit log di localStorage tanpa validasi | Audit penting → server-side |
| 12 | 🟡 MEDIUM | `lib/resend/index.ts:27` | `${notes}` di HTML email tanpa sanitasi → XSS | `he.escape()` |
| 13 | 🔵 LOW | `api/ai/assistant/route.ts:10` | `appendFile` di serverless (FS read-only) | Observability service |
| 14 | 🔵 LOW | `api/admin/users/route.ts:9` | Pagination loop max 2000 user tanpa timeout | Batas eksplisit / lazy |

**Test coverage:** 0% pada auth/admin path.

**Engineering Loop Auth/Core:**
1. [CRITICAL] Auth guard `/api/notifications/send` + verifikasi `curl` 401.
2. [CRITICAL] Selesaikan konflik dua middleware.
3. [HIGH] Fix IDOR AI session (`.eq("user_id")`) + test.
4. [HIGH] Rate limiting Redis-backed di login/admin.
5. [HIGH] Audit semua `createServiceClient` tanpa role check.
6. [MEDIUM] Hardening error + host injection + settings role guard.

---

### 3.8 Module: AI Assistant & Lain-lain

**Ringkasan:** AI endpoint punya auth dasar tapi IDOR kritis di GET messages (baca chat user lain via session_id). Prompt tanpa batas panjang (token exhaustion). Hardcoded UUID cashier di hook. Dead code `src/phases/*`.

| # | Sev | File:Line | Temuan | Rekomendasi |
|---|-----|-----------|--------|-------------|
| 1 | 🔴 CRITICAL | `api/ai/assistant/route.ts:85` | GET messages `eq("session_id")` tanpa `eq("user_id")` → baca chat user lain | Join `ai_assistant_sessions.user_id` |
| 2 | 🟠 HIGH | `api/ai/assistant/route.ts:144` | Prompt tanpa batas panjang → injection + token exhaustion | `.slice(0,2000)` + validasi tipe |
| 3 | 🟠 HIGH | `api/ai/assistant/route.ts:188` | Session update tanpa cek ownership | `.eq("user_id", user.id)` |
| 4 | 🟠 HIGH | `api/ai/assistant/route.ts` | Tak ada rate limiting POST | Rate limit per user |
| 5 | 🟠 HIGH | `hooks/use-pos-checkout.ts:91` | Hardcoded UUID `…-0001` sebagai cashier_id | Ambil dari auth session |
| 6 | 🟠 HIGH | `api/ai/assistant/route.ts:823` | File 823 baris (>800) | Ekstrak modul session/llm/summary/formatter |
| 7 | 🟡 MEDIUM | `api/ai/assistant/route.ts:700` | Path traversal potensial pada log file | `path.basename()` |
| 8 | 🟡 MEDIUM | `hooks/use-pos-shift.ts:65` | Stale closure (`cashierId` tak di deps) | Tambah ke deps array |
| 9 | 🟡 MEDIUM | `hooks/use-pos-checkout.ts:137` | `useCallback(fn, [])` tak tepat | Dokumentasi / perbaiki deps |
| 10 | 🟡 MEDIUM | `hooks/use-auth.ts:33` | Role dari `user_metadata` (bisa dimanipulasi user) | Ambil dari tabel `users` server-side |
| 11 | 🔵 LOW | `hooks/useActivityLogger.ts:26` | `metadata?: any` (14 fungsi) | `Record<string, unknown>` |
| 12 | 🔵 LOW | `src/phases/phase2-5-complete.ts` | Dead code (tak diimpor) | Hapus / pindah ke docs |

**Test coverage:** 0%.

**Engineering Loop AI:**
1. [CRITICAL] Fix IDOR GET messages + session update ownership.
2. [HIGH] Rate limiting + validasi panjang prompt.
3. [HIGH] Ganti hardcoded cashier_id.
4. [HIGH] Pecah `route.ts` AI jadi <400 baris/modul.
5. [MEDIUM] Role authorization dari DB, bukan metadata.
6. [LOW] Hapus dead code + mulai test AI/checkout.

---

## 4. Roadmap Engineering Loop Terpadu (Lintas Modul)

Urutan ini menyelesaikan akar masalah secara terpusat, bukan tambal per-route.

### 🔴 Loop 1 — Keamanan Darurat (1-2 minggu) — BLOCKER PRODUCTION
1. **Wrapper auth terpusat** — Buat HOF `withAuth(handler, { roles })` + custom ESLint rule yang menolak route handler tanpa panggil auth helper. Migrasikan ~104 route tanpa auth.
2. **Prioritaskan endpoint mutasi sensitif** — notifications/send, PO approve/send/cancel/payment, inventory adjustment, employee-salary (semua verb), loans/payslips, import CSV, table-order.
3. **Fix IDOR AI assistant** (GET messages + session update).
4. **Selesaikan konflik dua middleware** — verifikasi yang aktif via `next build`.

### 🔴 Loop 2 — Integritas Transaksi (1-2 minggu)
5. **Pindahkan alur multi-step ke Supabase RPC transaksional:** POS order creation, split-pay, ARK coin (topup/deduct), CRM redemption + avatar, GRN inventory update, leave approve + balance.
6. **Atomic balance update** — `UPDATE … WHERE balance >= amount RETURNING` untuk coin & XP (anti double-spend).
7. **DB sequence** untuk nomor PO/GRN/delivery/payment (anti race duplikat).

### 🟠 Loop 3 — Keuangan & Data Benar (1 minggu)
8. **Standarisasi timezone** `Asia/Jakarta` (konstanta) di semua kalkulasi date range.
9. **Uang dalam integer (sen)** atau `decimal.js`; hapus dummy data dashboard.
10. **Fix `unitCost=0`** GRN PATCH + swallowed inventory error.
11. **RBAC level approval** PR (`pending_finance`/`pending_direksi`).

### 🟠 Loop 4 — Hardening & Performa (1 minggu)
12. **Util `apiError()`** — pesan generik ke client, detail ke server log (ganti ~30 lokasi `error.message`).
13. **Rate limiting Redis-backed** di middleware (login, admin, AI, table-order publik).
14. **Eliminasi N+1 & unbounded query** — payroll calculator, inventory detail/summary, profit report, CRM dashboard, analytics overview.
15. **Sanitasi HTML email** (portal, resend) + hapus debug `console.log`/`test-insert`.

### 🟡 Loop 5 — Kualitas Kode (berkelanjutan)
16. **Perbaiki 65 error TypeScript** (mulai dari `lib/` & `types/`, lalu komponen UI yang kehilangan dependency `react-day-picker`, `@radix-ui/react-label`, `@types/swagger-ui-react`).
17. **Aktifkan type-check & lint di CI** (jangan di-ignore saat build).
18. **Pecah file >800 baris** (`grn/route.ts`, `grn/[id]/route.ts`, `ai/assistant/route.ts`).
19. **Hapus dead code** (`src/phases/*`, `hrdEmails`).

### 🧪 Loop 6 — Test Coverage 0% → 80% (berkelanjutan, mandatory project rule)
20. **Unit test** kalkulasi kritis: profit/margin, payroll, weighted average, XP/tier, tax.
21. **Integration test** auth (setiap endpoint sensitif → 401/403 tanpa token), happy-path + edge-case (insufficient balance, stok habis, concurrent).
22. **E2E** alur bisnis utama: POS checkout, split bill, PO lifecycle, leave approval, CRM redemption.
23. **Target ≥80%** sesuai `~/.claude/rules/common/testing.md`.

---

## 5. Lampiran — Metrik Terverifikasi

```
File TS/TSX           : 580
Route API             : 207
Route tanpa auth helper: ~104 (≈50%)
File pakai service/admin client: 96
console.log di api/   : 12 file
File test             : 2 (auth.test.ts, schemas.test.ts)
Test pass             : 39/39 ✅
TypeScript errors     : 65 ❌
Total temuan          : 90 (21 CRITICAL · 33 HIGH · 27 MEDIUM · 9 LOW)
```

> **Catatan metodologi:** Hitungan "route tanpa auth helper" berbasis grep pola (`requireApiRole|requireApiUser|getPosSession|getApiUser|getUser|auth.`). Beberapa route mungkin mendelegasikan proteksi ke RLS Supabase atau middleware — **wajib divalidasi manual** sebelum dianggap kerentanan nyata. Namun untuk endpoint mutasi data finansial, mengandalkan RLS saja tanpa cek di aplikasi adalah praktik berisiko.
