---
epic: EPIC-005
title: Xendit QRIS Integration — POS Topup ARK Coin
status: backlog
priority: P2
area: POS / CRM
created: 2026-06-22
---

# EPIC-005 — Xendit QRIS Integration (POS Topup)

## Latar Belakang

`/dashboard/pos/topup` dan `src/app/api/pos/topup/route.ts` sudah ada
struktur dasarnya tetapi masih TODO untuk integrasi Xendit. ARK Coin wallet
sudah ada di `src/lib/crm/`.

## Acceptance Criteria

- [ ] Generate Xendit QRIS payment untuk top-up ARK Coin
- [ ] Webhook handler di `/api/pos/topup/webhook` untuk konfirmasi Xendit
- [ ] Pada konfirmasi berhasil: kredit ARK Coin ke wallet member
- [ ] Tampilkan status top-up real-time (pending → paid → failed) dengan polling
  atau Supabase Realtime
- [ ] Receipt top-up yang bisa diprint
- [ ] Sandbox testing dengan Xendit test credentials
- [ ] Idempotency: webhook bisa diterima lebih dari sekali tanpa double credit

## Integrasi

- `src/lib/crm/` — wallet management (sudah ada)
- Xendit Node.js SDK atau Xendit REST API
- Tabel `pos_topup_transactions` untuk tracking status

## Catatan Teknis

- Xendit QRIS: POST ke `/v2/qr_codes` → dapat QR string → tampilkan ke kasir
- Webhook: Xendit kirim POST ke webhook URL saat payment confirmed/expired
- Butuh XENDIT_SECRET_KEY di `.env.local`
- Estimasi: ~3 hari

## Task Groups

### 1. DB
- [ ] Tabel `pos_topup_transactions` (id, member_id, amount, status, qr_id, qr_string, created_at)
- [ ] RLS policy

### 2. Xendit Integration
- [ ] `src/lib/xendit/` service
- [ ] `POST /api/pos/topup` — generate QR
- [ ] `POST /api/pos/topup/webhook` — handle confirmation

### 3. UI
- [ ] Top-up form dengan QR display
- [ ] Status polling / realtime
- [ ] Receipt print view

### 4. Testing
- [ ] Sandbox flow end-to-end
- [ ] Idempotency test

## Automation Log

| Tanggal | Agent | Aksi | Hasil |
| --- | --- | --- | --- |
| 2026-06-22 | Claude Code | Create epic file from PRD | done |
