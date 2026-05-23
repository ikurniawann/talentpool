# Table Self-Service Ordering Plan

Last updated: 2026-05-23

Dokumen ini menjelaskan rencana POS self-service untuk customer/member yang order dari meja lewat QR Code.

## Ringkasan

Setiap meja akan punya QR Code. Saat customer scan QR, customer diarahkan ke halaman ordering yang otomatis membawa table code/table id. Customer bisa masuk sebagai member lewat nomor HP atau order sebagai guest, memilih menu, memilih pembayaran, lalu submit order.

Flow ini terpisah dari POS cashier, tetapi order tetap masuk ke POS dan KDS/printer kitchen/bar.

## Route

Baseline UI:

```text
/table-order/[tableCode]
```

Contoh:

```text
/table-order/T-01
/table-order/VIP-02
```

## Flow Customer

```text
Scan QR meja
  -> buka /table-order/[tableCode]
  -> table otomatis dine-in
  -> customer input nomor member atau guest
  -> customer pilih menu
  -> setiap produk menampilkan XP
  -> customer pilih pembayaran
     -> QRIS
     -> ARK Coin
     -> Virtual Account
     -> Bayar di kasir
  -> submit order
  -> order masuk POS
  -> item otomatis masuk kitchen/bar
```

## Payment Options

- QRIS: customer bayar langsung.
- ARK Coin: customer member memakai saldo ARK Coin.
- Virtual Account: customer bayar mandiri melalui VA.
- Bayar di kasir: order masuk sebagai unpaid/open bill dan kasir memproses pembayaran.

## UI Baseline

File:

- `src/app/table-order/[tableCode]/page.tsx`

Yang sudah dibuat:

- Mobile-first table ordering page.
- Table code otomatis dari URL.
- Member phone input tersambung ke customer lookup.
- Guest checkout.
- Menu list dari `pos_products` dengan XP per produk.
- Cart dengan subtotal, tax, total XP, total amount.
- Payment method selection.
- Submit order ke POS order backend.
- Success state.
- Kitchen/bar routing melalui order item KDS.

## Data Yang Perlu Disambungkan

### Products

Menu mengambil data dari:

- `pos_products`
- `pos_categories`
- `xp_points`

Product harus menampilkan:

- name
- description
- price
- image
- category
- station kitchen/bar
- XP per product

### Table

QR Code harus membawa table identity.

Rekomendasi:

- table code tidak langsung expose raw database id.
- gunakan signed table token atau public table code.
- sistem resolve table code ke `table_id`.
- jika table code belum terdaftar, order tetap bisa dibuat dengan table code di notes/special request.

### Customer

Member lookup:

- by phone
- optional member card/NFC di fase berikut

Guest:

- tetap bisa order
- tidak menyimpan XP ke member

### Order

Order dibuat sebagai:

- `order_type = dine_in`
- `table_id` dari QR
- `status = pending` untuk unpaid/open bill
- `status = confirmed` untuk ARK Coin yang langsung paid
- `payment_status`:
  - `paid` untuk ARK Coin sukses
  - `unpaid` untuk QRIS/VA/kasir sebelum gateway atau kasir memproses pembayaran

### Kitchen/Bar

Setelah order berhasil:

- item kitchen masuk kitchen KDS/printer
- item bar masuk bar KDS/printer

Baseline existing KDS sudah bisa filter station dari nama produk. Ke depan lebih proper jika product punya station mapping eksplisit.

## API Yang Dibutuhkan

```text
GET  /api/table-order/session/[tableCode]
GET  /api/table-order/products
POST /api/table-order/customers/lookup
POST /api/table-order/orders
POST /api/table-order/orders/[id]/pay/qris
POST /api/table-order/orders/[id]/pay/va
```

Status:

- `GET /api/table-order/session/[tableCode]`: done.
- `GET /api/table-order/products`: done.
- `POST /api/table-order/customers/lookup`: done.
- `POST /api/table-order/orders`: done.
- QRIS/VA payment callback: pending gateway integration.

## Development Phases

### Phase 1 - UI Baseline

Status: Done

- Route `/table-order/[tableCode]`.
- Member/guest step.
- Menu step.
- Payment step.
- Success step.
- XP per product visible.

### Phase 2 - Products API

Status: Done

- Product source dari `pos_products`.
- Tampilkan `xp_points`.
- Filter unavailable product.
- Category filter.

### Phase 3 - Table Session

Status: Baseline Done

- Resolve QR table code ke `table_id`.
- Validate table aktif.
- Prevent fake/random table code masih perlu signed token atau table registry strict mode.

### Phase 4 - Submit Order

Status: Baseline Done

- Create order dine-in.
- Support bayar di kasir sebagai open bill.
- Push item ke KDS/printer.

### Phase 5 - Payment

Status: Partial

- QRIS: order dibuat unpaid, gateway belum disambungkan.
- ARK Coin: langsung deduct balance, order paid, CRM XP awarded.
- Virtual Account: order dibuat unpaid, gateway belum disambungkan.
- Payment callback/status polling.

### Phase 6 - Admin Monitoring

- Kasir lihat self-service order.
- Retry print.
- Void/cancel.
- Table order history.
