---
epic: EPIC-006
title: CRM Fase 4 — Advanced Avatar, Member Portal, Campaign
status: backlog
priority: P3
area: CRM
created: 2026-06-22
---

# EPIC-006 — CRM Fase 4: Advanced Features

## Latar Belakang

CRM sudah selesai Fase 1–3 (tier, XP, wallet, redemption). Fase 4 mencakup
fitur advanced: avatar collectible, member portal self-service, dan
campaign/targeted promotion.

## Fitur yang Dibutuhkan

### 6.1 Advanced Avatar System
- [ ] Avatar unlock via XP milestones atau event khusus
- [ ] Member punya inventory avatar
- [ ] Equip avatar sebagai profile picture di table ordering & member portal
- [ ] Rarity system: Common / Rare / Epic / Legendary
- [ ] Avatar showcase di member profile

### 6.2 Member Portal (Self-Service)
- [ ] Login dengan nomor HP atau member card
- [ ] Dashboard: XP balance, tier, next tier progress bar
- [ ] Riwayat transaksi & XP earned
- [ ] Katalog reward + tombol redeem
- [ ] Avatar collection & equip
- [ ] Edit profil

### 6.3 Campaign & Targeted Promotion
- [ ] Segmentasi: by tier, visit frequency, total spent, last visit
- [ ] Buat campaign: bonus XP / diskon / free item
- [ ] Jadwal: immediate atau scheduled
- [ ] Tracking: berapa member menerima, berapa yang redeem
- [ ] Notifikasi via WA/Email (butuh EPIC-004)

## Catatan Teknis

- Member portal bisa di subdomain `member.arkivworld.com` atau path `/member`
- Avatar assets perlu storage bucket baru di Supabase Storage
- Campaign butuh cron job atau Supabase scheduled functions
- Estimasi: ~2–3 minggu

## Dependencies

- EPIC-004 (Notifikasi) untuk campaign broadcast
- EPIC-005 (Xendit) untuk member portal topup flow (opsional)

## Task Groups

### 1. Avatar System
- [ ] DB: `crm_avatars`, `crm_member_avatars`
- [ ] Unlock logic (XP milestone trigger)
- [ ] Avatar inventory UI

### 2. Member Portal
- [ ] Auth: login by HP/card number
- [ ] Dashboard halaman utama
- [ ] Halaman riwayat & reward catalog
- [ ] Avatar collection UI

### 3. Campaign Engine
- [ ] DB: `crm_campaigns`, `crm_campaign_recipients`
- [ ] Segmentation builder
- [ ] Campaign form & schedule
- [ ] Broadcast via EPIC-004 notification layer
- [ ] Analytics dashboard

## Automation Log

| Tanggal | Agent | Aksi | Hasil |
| --- | --- | --- | --- |
| 2026-06-22 | Claude Code | Create epic file from PRD | done |
