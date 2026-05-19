# Arkiv POS - Progress Report

> **Project:** talentpool
> **Platform:** Next.js 14+ App Router + Supabase + TypeScript + Tailwind + shadcn/ui
> **Last Updated:** 2026-05-18
> **Status:** Split Bill Phase 2 (Per Item) Completed & Live

---

## Executive Summary

Modul POS (Point of Sale) Arkiv telah melewati fase **audit, refactor, atomic rewrite, dan feature expansion**. Berikut perubahan-perubahan utama yang telah diimplementasikan dan terverifikasi.

---

## 1. Phase 0: Audit & Critical Fixes (POS Module)

### Masalah Awal yang Teridentifikasi
- Cashier page `page.tsx` **1.041 baris monolith** - mixes UI, state, payment, NFC, print logic
- Order API tidak pakai **database transaction** - risiko order tanpa item
- API me-**overwrite** XP secara absolut (`total_xp: xp_earned`) - bukan increment
- `visit_count` **hardcoded** = 1 - tidak increment
- Client mengirim `total_amount` - server **mempercayai** tanpa re-calculate
- **Tidak ada auth guard** di API produk
- Cart state tidak persist setelah refresh (pure `useState`)
- Dashboard POS pakai **mock data** 100%

### Perubahan Dilakukan

#### A. Database - Supabase RPC Functions (`004_pos_transaction_rpc.sql`)
| Function | Tujuan |
|----------|--------|
| `pos_create_order_transaction()` | Atomic order creation: insert order → items → stock validate → inventory deduct → XP increment → ARK deduct → audit trail. Semua dalam 1 `BEGIN...COMMIT`. |
| `update_ark_coin_balance()` | Row lock (`SELECT ... FOR UPDATE`) sebelum deduct ARK. Cegah race condition / double-spend. |
| `pos_calculate_xp_earned()` | XP multiplier per tier: Bronze 1x, Silver 1.1x, Gold 1.2x, Platinum 2x. |
| `pos_validate_stock()` | Cek stok via BOM/recipe sebelum checkout. |
| `pos_deduct_inventory()` | Kurangi `raw_materials` stock berdasarkan recipe. |
| `generate_order_number()` | Auto-increment order number per hari: `POS-20260518-0001`. |

#### B. API Routes
- **`src/app/api/pos/orders/route.ts`** - Sekarang panggil `supabase.rpc('pos_create_order_transaction')` untuk atomicity. Men-support dual mode: single-payment dan split bill.

#### C. Frontend - Massive Refactor
| File Sebelum | Setelah |
|-------------|---------|
| `cashier-new/page.tsx` (1.041 lines) | **432 lines** - lean page yang compose hooks & components |

**Hooks baru:**
| Hook | Fungsi |
|------|--------|
| `usePosCart.ts` | Cart state via `useReducer` + **localStorage persistence** |
| `usePosProducts.ts` | Fetch & cache produk + kategori |
| `usePosCustomers.ts` | Fetch customer + inject `discount` field |
| `usePosCheckout.ts` | Checkout flow, payload builder untuk API |

**Components baru:**
| Komponen | Fungsi |
|----------|--------|
| `CustomizationModal.tsx` | Pilih variant + modifier + qty + catatan |
| `PaymentModal.tsx` | Pilih metode bayar + input cash/ARK |
| `NFCModal.tsx` | NFC/QR member card tap + manual ID input |
| `CustomerSearchModal.tsx` | Search & pilih member |
| `PrintReceipt.tsx` | Helper print thermal 58mm (Kitchen/Bar/Customer) |

#### D. Bug Fixes
- ✅ XP bug: sekarang **increment** (`total_xp + xp_earned`)
- ✅ Visit count bug: sekarang **increment** (`visit_count + 1`)
- ✅ Server-side total re-calculation
- ✅ Stock validation on checkout
- ✅ Authentication guard via `getPosSession()`
- ✅ Cart persist via `localStorage`

---

## 2. Phase 1: Split Bill Equal (Completed)

### Overview
Fitur **Split Bill** memungkinkan 1 order dibayar oleh beberapa pihak (patungan) tanpa mempengaruhi kitchen flow. Phase 1 fokus ke mode **Equal Split** (bagi rata).

## 2b. Phase 2: Split Bill Per Item (Completed)

### What Changed
- **Migration 006** `pos_split_per_item.sql` - Update RPC `pos_create_split_order_transaction` untuk insert `pos_order_split_items`
- **SplitBillModal.tsx** - Major rewrite dengan mode toggle [Sama Rata] / [Per Item]
- **Per Item UI** - Tiap item di cart bisa di-assign qty per split via stepper (+/-). Tax & discount prorate otomatis per rasio subtotal.
- **SplitWithItems** type baru di `pos-api.ts`
- **Checkout payload** now includes `items[]` per split

### Konsep Arsitektur
```
1 Order = 1 Kitchen Tiket (tetap)
  ├── N Split Bills (pembayaran terpisah)
  │     ├── Split #1: Andi - Rp 70.000 (paid cash)
  │     ├── Split #2: Budi - Rp 70.000 (pending)
  │     └── Split #3: Citra - Rp 70.000 (paid ARK)
  └── Order.payment_status: partially_paid → paid
```

### Database Changes (`005_pos_split_bill_schema.sql`)

#### New Tables
| Tabel | Fungsi |
|-------|--------|
| `pos_order_splits` | 1 row per bill. Field: `order_id`, `split_index`, `label`, `total_amount`, `amount_paid`, `payment_method`, `status`, `customer_id`, `ark_coins_used` |
| `pos_order_split_items` | Mapping item ke split (untuk Phase 2 Per Item) |
| `pos_split_payments` | Audit trail setiap pembayaran per split |

#### New RPC Functions
| Function | Fungsi |
|----------|--------|
| `pos_create_split_order_transaction()` | Atomic: insert order + items + splits. Payment status = `unpaid`. |
| `pos_pay_split_transaction()` | Bayar 1 split: lock row, validasi, ARK deduct, update status, auto-check all-paid |
| `pos_get_order_splits()` | List splits + aggregate summary (`total_paid`, `total_remaining`) |
| `pos_cancel_split()` | Cancel split yang masih `pending` |

### API Endpoints
| Endpoint | Method | Fungsi |
|----------|--------|--------|
| `POST /api/pos/orders` | Extend | Kalau body punya `splits[]`, panggil RPC split |
| `GET /api/pos/orders/{id}/splits` | New | List semua split + summary |
| `POST /api/pos/orders/{id}/splits/{splitId}/pay` | New | Bayar 1 split |
| `PATCH /api/pos/orders/{id}/splits/{splitId}` | New | Cancel split |

### New Frontend Components
| File | Fungsi |
|------|--------|
| `SplitBillModal.tsx` | Modal konfigurasi: pilih jumlah orang, bagi rata otomatis, label nama, rounding remainder ke split terakhir |
| `SplitPaymentScreen.tsx` | Layar full-screen setelah order tersimpan: list splits, bayar per split, track total paid/remaining, print struk per split |

### CartPanel Integration
- Tombol **"Split Bill"** (border pink, non-dominant) muncul di bawah tombol "Bayar"
- Tombol disabled saat cart kosong

### Flow Pengguna (Split Bill)
```
[Cart] → Klik "Split Bill"
  → Modal: Pilih jumlah orang (2-N) + label nama
  → Konfirmasi Split
  → Order tersimpan (kitchen print 1x)
  → Layar Split Payment (overlay)
      → Tap belum-dibayar split
      → Muncul PaymentModal (reusable)
      → Bayar → Status berubah ✅ Lunas
      → Kalau semua paid → Selesai
```

---

## 3. Complete File Inventory

### Created Files

```
migrations/
├── 004_pos_transaction_rpc.sql         # Atomic order + stock + XP + ARK
└── 005_pos_split_bill_schema.sql       # Split bill tables + RPCs

src/hooks/
├── use-pos-cart.ts
├── use-pos-products.ts
├── use-pos-customers.ts
├── use-pos-checkout.ts
└── use-pos-kds.ts                       # NEW Phase 3 (KDS polling)

src/app/dashboard/pos/
├── cashier-new/page.tsx
├── orders/page.tsx
├── kds/page.tsx                         # NEW Phase 3 (KDS fullscreen)

src/components/pos/
├── CustomizationModal.tsx
├── PaymentModal.tsx
├── NFCModal.tsx
├── CustomerSearchModal.tsx
├── PrintReceipt.tsx
├── SplitBillModal.tsx                  # NEW Phase 1
├── SplitPaymentScreen.tsx               # NEW Phase 1
└── KDSOrderCard.tsx                     # NEW Phase 3

src/app/api/pos/orders/
├── [id]/
│   ├── splits/
│   │   ├── route.ts
│   │   └── [splitId]/
│   │       ├── route.ts
│   │       └── pay/
│   │           └── route.ts
│   └── status/
│       └── route.ts                     # NEW Phase 3 (KDS status update)

src/app/api/pos/kds/
└── route.ts                             # NEW Phase 3 (KDS list)
```

### Modified Files

```
src/
├── lib/
│   └── pos-api.ts                       # +Order, +Split types, +api functions
├── components/pos/
│   └── CartPanel.tsx                    # +Split Bill button
├── app/api/pos/orders/
│   └── route.ts                         # Dual mode: single vs split
├── app/dashboard/pos/
│   ├── cashier-new/page.tsx             # Refactored from 1041 → ~430 lines
│   └── orders/page.tsx                  # PrintReceipt fix, type fixes
└── POS_MODULE_ANALYSIS.md               # Original analysis report
```

---

## 4. Schema Database (Ringkasan)

### Table Relationships
```
pos_orders (1)
  ├── pos_order_items (N)
  ├── pos_order_status_history (N)
  ├── pos_order_splits (N) [NEW]
  │     ├── pos_order_split_items (N) [NEW]
  │     └── pos_split_payments (N) [NEW]
  └── pos_xp_transactions (N)

pos_customers (1)
  ├── pos_orders (N)
  └── pos_xp_transactions (N)

pos_products (1)
  ├── pos_product_variants (N)
  └── pos_modifier_groups (N)
      └── pos_modifiers (N)
```

---

## 5. Known Issues & Tech Debt

| # | Issue | Lokasi | Prioritas | Phase Fix |
|---|-------|--------|-----------|-----------|
| 1 | `pos/products/page.tsx`: `size="icon-sm"` tidak valid shadcn | `pos/products` | Low | - |
| 2 | `pos/topup/page.tsx`: tier case mismatch `"Gold"` vs `"gold"` | `pos/topup` | Low | - |
| 3 | `pos/reservation/page.tsx`: tipe "custom" tidak assignable | `pos/reservation` | Low | - |
| 4 | ~~Split Bill hanya support Equal~~ → **Per Item done!** | Split Bill | Done | Phase 2 |
| 5 | ~~JSONB scalar error: `JSON.stringify()` di route~~ | API | Done | 007 + route fix |
| 6 | ~~`branch_id`/`table_id` tidak ada di `pos_orders`~~ | Migrations | Done | 007 rewritten |
| 7 | Offline mode belum ada | Global | Medium | Phase 3 |
| 8 | Shift management belum ada | POS | Medium | — |
| 9 | ~~KDS (Kitchen Display System)~~ → **Done!** | POS | Done | Built + tested |

---

## 6. Test Checklist (Diverifikasi)

- [x] TypeScript build bersih via `npx tsc --noEmit`
- [x] Next.js build sukses via `npx next build`
- [x] Supabase migration 006 berhasil di-apply
- [x] Supabase migration 007 berhasil di-apply (fix JSONB guard + branch_id/table_id)
- [x] RPC `pos_create_order_transaction` teruji atomik
- [x] RPC `pos_pay_split_transaction` teruji atomik
- [x] Cart persist via localStorage setelah refresh
- [x] Split bill: order creation + payment flow
- [x] ARK Coin deduction per split (dengan member)
- [x] Print receipt thermal 58mm format
- [x] **KDS (Kitchen Display System)** — real-time order queue dengan polling 3 detik, sound notification, station filter, status timer, color-coded urgency, responsive grid card layout
- [x] Next.js build sukses dengan semua komponen KDS

---

## 7. Roadmap Selanjutnya

| Phase | Fitur | Estimasi | File Utama |
|-------|-------|----------|-----------|
| **2** | Per Item Split (drag/drop item ke split) | 1 hari | `SplitBillModal.tsx`, `pos_order_split_items` |
| **2** | Custom Nominal Split | 4-6 jam | `SplitBillModal.tsx` |
| **2** | Refund per Split | 1 hari | `pos_pay_split_transaction` (reverse) |
| **3** | Shift Management (buka/tutup shift) | 1 hari | `pos_shifts` table |
| **3** | ~~Kitchen Display System (KDS)~~ | **Done** | `dashboard/pos/kds/` |
| **3** | Offline Mode (service worker + IndexedDB) | 1-2 hari | `sw-pos.ts`, `db-pos.ts` |

---

## 8. Cara Menjalankan

---

## 4. Shift Management (A1 — Completed)

- Migration 008: `pos_shifts` table + `pos_orders.shift_id` + trigger auto-totals
- API: `/pos/shifts`, `/pos/shifts/current`, `/pos/shifts/[id]/close`
- Hook: `usePosShift.ts` + Komponen: `ShiftModal.tsx`
- Guard: checkout disabled tanpa shift aktif

## 5. Void + Table Move/Merge (Completed)

- Migration 009: `pos_supervisor` role, `users.pos_pin`, void/merge columns, enum 'voided'/'merged'
- RPC: `pos_void_order`, `pos_merge_orders`, `pos_move_order_table`
- API: `POST /orders/[id]/void`, `PATCH /orders/[id]/table`, `POST /orders/[id]/merge`
- Komponen: `VoidModal.tsx`, `MoveTableModal.tsx`, `MergeTableModal.tsx`
- Supervisor PIN required untuk void & merge

## Cara Menjalankan Lengkap

```bash
# Apply all migrations
psql $DATABASE_URL -f migrations/004_pos_transaction_rpc.sql
psql $DATABASE_URL -f migrations/005_pos_split_bill_schema.sql
psql $DATABASE_URL -f migrations/006_pos_split_per_item.sql
psql $DATABASE_URL -f migrations/007_pos_jsonb_guard.sql
psql $DATABASE_URL -f migrations/008_pos_shift_management.sql
psql $DATABASE_URL -f migrations/009_pos_void_and_table_management.sql

# Buat user supervisor (contoh)
INSERT INTO users (id, full_name, role, pos_pin) VALUES
  (gen_random_uuid(), 'Supervisor POS', 'pos_supervisor', '1234')
ON CONFLICT DO NOTHING;

# Jalankan dev
npm run dev
```

---

*Dokumen ini living document - update setiap ada milestone baru.*
