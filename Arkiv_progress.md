# Arkiv POS Progress

## Completed Features

### Core Refactor (A0)
- [x] Atomic RPC `pos_create_order_transaction` — single payment
- [x] Atomic RPC `pos_create_split_order_transaction` — split bill
- [x] Atomic RPC `pos_pay_split_transaction` — pay per split
- [x] Server-side recalculation (never trust client total)

### Shift Management (A1)
- [x] Migration 008 — `pos_shifts` table + trigger auto-totals
- [x] API — `/shifts`, `/shifts/current`, `/shifts/[id]/close`
- [x] Hook — `usePosShift.ts` with open/close helpers
- [x] UI — `ShiftModal.tsx` (open form, close form with variance summary)
- [x] Integration — Guard checkout without active shift

### Split Bill (A2)
- [x] Migration 005 + 006 + 007 — split tables, per-item schema, JSONB guards
- [x] `SplitBillModal.tsx` — toggle Equal/Per Item, item assignment grid
- [x] `SplitPaymentScreen.tsx` — pay remaining splits
- [x] Prorated tax/discount

### Kitchen Display System (A3)
- [x] `/dashboard/pos/kds/page.tsx` — fullscreen dark grid
- [x] `usePosKDS.ts` — 3s polling + Web Audio beep on new orders
- [x] `KDSOrderCard.tsx` — live timer, overdue pulse, station filtering
- [x] Auto-navigation link in layout

### Void + Table Management (A4)
- [x] Migration 009 — `pos_supervisor` role, `users.pos_pin`, void/merge columns
- [x] `VoidModal.tsx` — reason dropdown + supervisor PIN
- [x] `MoveTableModal.tsx` — change order type, table grid
- [x] `MergeTableModal.tsx` — merge into target order + supervisor PIN
- [x] API endpoints — `/orders/[id]/void`, `/table`, `/merge`

### Open Bill (A5)
- [x] API `POST /orders/open-bill` — save order without payment
- [x] Status: `pending`, payment_status: `unpaid`
- [x] Button "Simpan / Buka Bill" in CartPanel (amber)
- [x] Debug logging + loading state
- [ ] **Needs testing** — debug logs added for trace

## Pending / Next
- [ ] Custom Nominal Split
- [ ] Refund per Split
- [ ] Offline Mode (service worker + IndexedDB)
- [ ] POS Reports & Analytics

## Migrations Checklist
- [ ] 004_pos_transaction_rpc.sql
- [ ] 005_pos_split_bill_schema.sql
- [ ] 006_pos_split_per_item.sql
- [ ] 007_pos_jsonb_guard.sql
- [ ] 008_pos_shift_management.sql
- [ ] 009_pos_void_and_table_management.sql

## URLs
- Production: https://suluinwounderland.com
- GitHub: https://github.com/ikurniawann/talentpool
