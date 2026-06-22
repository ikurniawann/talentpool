---
epic: EPIC-004
title: Notifikasi Email & WhatsApp (Cross-module)
status: backlog
priority: P2
area: Cross-module
created: 2026-06-22
---

# EPIC-004 — Notifikasi Email & WhatsApp

## Latar Belakang

Banyak `TODO` notifikasi ditemukan di kode tapi belum diimplementasi:

| File | Trigger |
| --- | --- |
| `api/hris/leaves/approve/route.ts` | Persetujuan cuti → notif ke karyawan |
| `api/hris/leaves/route.ts` | Pengajuan cuti → notif ke manager |
| `api/hris/offboarding/route.ts` | Offboarding → notif ke HRD, IT, Finance, Manager |
| `api/hris/feedback-responses/route.ts` | 360 feedback selesai → notif ke HR |

## Acceptance Criteria

### 4.1 Notification Service Layer
- [ ] `src/lib/notifications/` dengan provider: Email + WhatsApp
- [ ] Email provider: Resend atau Nodemailer
- [ ] WhatsApp provider: WA Business API atau Fonnte
- [ ] Template-based: tiap event punya template pesan sendiri
- [ ] Queue-based (async) agar tidak block API response
- [ ] Log pengiriman (berhasil/gagal) ke DB tabel `notification_logs`
- [ ] Fallback: jika WA gagal → kirim email, dan sebaliknya

### 4.2 Event Triggers

| Event | Channel | Penerima |
| --- | --- | --- |
| Leave request submitted | WA + Email | Manager langsung |
| Leave approved/rejected | WA + Email | Karyawan |
| Offboarding initiated | Email | HRD, IT, Finance, Manager |
| 360 feedback completed | Email | HR |
| PO approval needed | Email | Approver |
| Low stock alert | Email | Purchasing Admin |
| Reimbursement status change | WA | Karyawan |

### 4.3 Notification Settings
- [ ] Per-user: aktifkan/nonaktifkan channel (email/WA)
- [ ] Admin bisa konfigurasi template pesan
- [ ] Riwayat notifikasi per user di `/dashboard/notifications`

## Catatan Teknis

- DB trigger di `leaves` sudah ada tapi hanya ke tabel `notifications` internal
  (bukan ke email/WA eksternal)
- Implementasi queue bisa pakai Supabase Edge Functions + pg_notify, atau
  background job sederhana di Next.js API
- Estimasi: ~1 minggu

## Task Groups

### 1. Service Layer
- [ ] `src/lib/notifications/index.ts` — unified send interface
- [ ] Email provider integration
- [ ] WA provider integration
- [ ] `notification_logs` tabel + RLS

### 2. Wire up existing TODOs
- [ ] `leaves/approve/route.ts`
- [ ] `leaves/route.ts`
- [ ] `offboarding/route.ts`
- [ ] `feedback-responses/route.ts`

### 3. New triggers (PO, low stock, reimbursement)

### 4. Notification Settings UI

## Automation Log

| Tanggal | Agent | Aksi | Hasil |
| --- | --- | --- | --- |
| 2026-06-22 | Claude Code | Create epic file from PRD | done |
