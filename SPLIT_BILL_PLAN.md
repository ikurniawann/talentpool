# Rencana Sistem Split Bill — Arkiv POS

> Status: **DESIGN REVIEW** — Menunggu approval sebelum implementasi  
> Target: Integrasi seamless dengan atomic order & ARK Coin loyalty

---

## 1. Latar Belakang

Pemandu kasir F&B sering menemukan meja besar (4–8 orang) yang masing-masing ingin bayar terpisah. Sistem saat ini hanya mendukung **1 payment per order**. Fitur Split Bill harus memungkinkan:

- 1 order tetap 1 order (dapur tetap terima 1 tiket, tidak pecah)
- Pembayaran bisa dilakukan oleh beberapa pihak/"split"
- Integrasi ARK Coin loyalty tetap jalan (per split boleh ada member berbeda)
- Atomic & consistent: seluruh pembayaran tercatat, tidak ada double-spend ARK

---

## 2. Split Modes

| Mode | Deskripsi | Use Case |
|------|-----------|----------|
| **Equal** (Sama Rata) | Total dibagi rata `N` orang. Rounding ke bawah Rp 100; sisa masuk ke split terakhir. | Makan bareng 4 orang, bayar patungan |
| **Per Item** | Setiap item ditetapkan ke pihak tertentu. Pajak & diskon prorate otomatis per rasio subtotal. | Masing-masing pesan menu sendiri, duduk bareng |
| **Custom Nominal** | Kasir input nominal per pihak. Sistem validasi jumlah nominal = total order. | Ada yang bayar lebih besar, sisanya orang lain |

**Phase 1** akan fokus ke **Equal** dahulu karena paling sederhana dan paling sering dipakai.

---

## 3. Skema Database (Baru)

Tabel baru dibuat tanpa menyentuh tabel existing. Migration file: `migrations/005_pos_split_bill_schema.sql`

```sql
-- Enum status split
CREATE TYPE pos_split_status AS ENUM ('pending', 'paid', 'partial', 'cancelled');

-- Core split table
CREATE TABLE pos_order_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  split_index INTEGER NOT NULL,
  label TEXT DEFAULT '',                   -- e.g. "Andi", "Meja A"
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash','qris','debit','credit','ark_coin')),
  status pos_split_status NOT NULL DEFAULT 'pending',
  customer_id UUID REFERENCES pos_customers(id),   -- member yang bayar split ini (opsional)
  ark_coins_used NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  UNIQUE(order_id, split_index)
);

-- Mapping item ke split (untuk mode Per Item)
CREATE TABLE pos_order_split_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES pos_order_splits(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES pos_order_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  UNIQUE(split_id, order_item_id)
);

-- Audit trail payment per split (bisa >1 record kalau partial bayar bertahap)
CREATE TABLE pos_split_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  split_id UUID NOT NULL REFERENCES pos_order_splits(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES pos_orders(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  change_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL,
  reference_number TEXT,                 -- QRIS ref, trace EDC
  cashier_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index untuk performa lookup split by order
CREATE INDEX idx_pos_order_splits_order ON pos_order_splits(order_id);
CREATE INDEX idx_pos_split_payments_split ON pos_split_payments(split_id);

-- RLS enable pada tabel baru
ALTER TABLE pos_order_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_order_split_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_split_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON pos_order_splits FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pos_order_split_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON pos_split_payments FOR ALL USING (true) WITH CHECK (true);
```

### Modifikasi Minimal ke `pos_orders`

Hanya menambah `payment_status` baru (tidak strict schema change karena tipe `TEXT`):

```sql
-- Pastikan payment_status bisa menerima nilai baru
-- (Tidak perlu ALTER karena pos_orders.payment_status sudah TEXT)
-- Dokumentasi nilai yang valid:
--   'unpaid' | 'partially_paid' | 'paid' | 'refunded' | 'failed'
```

---

## 4. Business Rules

| # | Rule | Alasan |
|---|------|--------|
| 1 | **Order tetap 1 tiket ke dapur** | Dapur/Kitchen print tetap 1x, tidak pecah per split |
| 2 | **Kitchen bisa mulai sebelum semua split dibayar** | `order.status` (pending→preparing→ready) mengikuti kitchen flow. `payment_status` mengikuti payment flow. |
| 3 | **Split bisa bayar kapan saja** | Tidak wajib paid saat order creation. Split payment = step terpisah. |
| 4 | **ARK Coin hanya bisa di split yang punya `customer_id`** | Kalau non-member pakai ARK ⇒ error. Saldo dicek & lock saat bayar. |
| 5 | **XP & visit_count tetap ke order.customer_id utama** | Loyalty tracking tidak pecah per split; split hanya tentang pembayaran. |
| 6 | **Order.payment_status otomatis derivatif** | `unpaid` → `partially_paid` saat 1+ split paid. → `paid` saat semua split paid. |
| 7 | **Tidak bisa edit/tambah item setelah split dibuat** | Phase 1: order final saat split dibuat. Kalau mau tambah item, batalkan split & buat order baru. |
| 8 | **Refund per split = Phase 2** | Phase 1 hanya support full order refund. Refund per partial split belum ada. |

---

## 5. API Design

### 5.1 Create Order with Split (Tidak langsung bayar)

```http
POST /api/pos/orders
Content-Type: application/json

{
  "order_type": "dine_in",
  "table_id": "Meja 5",
  "customer_id": "cust-001",
  "items": [ ... ],
  "subtotal": 200000,
  "tax_amount": 20000,
  "discount_amount": 10000,
  "total_amount": 210000,
  "splits": [
    {
      "label": "Andi",
      "subtotal": 100000,
      "tax_amount": 10000,
      "discount_amount": 5000,
      "total_amount": 105000,
      "customer_id": "cust-001"
    },
    {
      "label": "Budi",
      "subtotal": 100000,
      "tax_amount": 10000,
      "discount_amount": 5000,
      "total_amount": 105000
    }
  ]
}
```

**Baru:** field `splits[]` di body.  
**Perilaku:** Kalau `splits` ada & panjang > 0:
- Order dibuat dengan `payment_status = 'unpaid'`
- Tidak ada ARK deduction / cash processing di RPC create
- Split rows dibuat otomatis
- Kitchen print bisa langsung

Kalau `splits` absent: **backwards compatible**, pakai flow existing (single payment atomic).

### 5.2 List Splits (untuk Split Payment Screen)

```http
GET /api/pos/orders/{id}/splits
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "split-01",
      "label": "Andi",
      "total_amount": 105000,
      "amount_paid": 0,
      "status": "pending",
      "customer_id": "cust-001",
      "payment_method": null
    },
    { ... }
  ],
  "order_payment_status": "unpaid",
  "total_paid": 0,
  "total_remaining": 210000
}
```

### 5.3 Pay a Split

```http
POST /api/pos/orders/{id}/splits/{splitId}/pay
Content-Type: application/json

{
  "payment_method": "ark_coin",
  "amount_paid": 105000,
  "ark_coins_used": 105000,
  "cashier_id": "user-01"
}
```

**Validasi:**
- `amount_paid >= split.total_amount`
- Kalau `ark_coin`, lock customer row & saldo cukup.

**Efek:**
- Insert `pos_split_payments` (audit)
- Update split: `status = 'paid'`, `amount_paid`, `change_amount`, `payment_method`, `paid_at`
- Kalau semua splits `paid`, auto update order: `payment_status = 'paid'`, `completed_at = now()`
- Trigger print customer receipt untuk split ini

### 5.4 Cancel a Split (kasir salah hitung)

```http
PATCH /api/pos/orders/{id}/splits/{splitId}
```

Body: `{ "status": "cancelled" }` (hanya boleh kalau masih `pending`).

---

## 6. Frontend UI/UX Flow

### Step 1 — Cart & Split Button
```
[CartPanel]
├─ ... items ...
├─ Subtotal Rp 200.000
├─ [Bayar Langsung]          ← existing flow
└─ [Split Bill]              ← tombol baru
```

### Step 2 — Split Configuration Modal
```
+-----------------------------------------+
|  Split Bill — Meja 5                    |
+-----------------------------------------+
| Mode:  [Sama Rata] [Per Item] [Kustom]  |
|-----------------------------------------|
| Jumlah Orang:  [ 3 ▼]                   |
|                                         |
| Split #1: [Andi          ]  Rp 70.000   |
| Split #2: [Budi          ]  Rp 70.000   |
| Split #3: [Citra         ]  Rp 70.000   |
| Sisa rounding (+Rp 0)                 |
|                                         |
| [Batal]              [Konfirmasi Split]   |
+-----------------------------------------+
```

- **Equal**: input `N` → total otomatis dibagi.
- **Per Item**: drag/drop item ke card masing-masing (Phase 2).
- **Custom**: input nominal manual per row. Sisa wajib 0.

### Step 3 — Split Payment Screen
Setelah order + split tersimpan:

```
+-----------------------------------------+
|  Meja 5 — Order #POS-20260518-0042      |
|  Status Dapur: Preparing                |
+-----------------------------------------+
|                                         |
|  ┌─ Andi (Rp 70.000) ─┐                 |
|  │  [Belum Dibayar]   │ ← tap to pay   |
|  └─────────────────────┘                |
|  ┌─ Budi (Rp 70.000) ─┐                 |
|  │  [Belum Dibayar]   │                 |
|  └─────────────────────┘                |
|  ┌─ Citra (Rp 70.000) ─┐                |
|  │  ✅ Paid — QRIS      │                 |
|  └─────────────────────┘                |
|                                         |
|  Total: Rp 210.000   Sisa: Rp 140.000   |
+-----------------------------------------+
```

Tap split → muncul **PaymentModal** (reuse existing) tapi dengan total = split.total_amount.

### Step 4 — Completion
Kalau semua split paid:
- Order berubah `payment_status` → `paid`
- Muncul modal sukses + tombol print struk (bisa print per split atau gabungan)

---

## 7. Supabase RPC Functions

### `pos_create_split_order_transaction(...)`
- Input: sama dengan `pos_create_order_transaction` + `splits[]` JSONB
- Proses:
  1. Insert order (`payment_status = 'unpaid'`)
  2. Insert order items (seperti biasa)
  3. Insert `pos_order_splits` per entry
  4. Kalau mode Per Item, insert `pos_order_split_items`
  5. Insert audit pos_order_status_history "created"
  6. Return order_id + array split_ids

> **Tidak ada** payment deduction di sini. ARK/cash belum terlibat.

### `pos_pay_split_transaction(...)`
- Input: `p_split_id`, `p_payment_method`, `p_amount_paid`, `p_ark_coins`, `p_cashier_id`
- Proses:
  1. `BEGIN`
  2. Lock split & order row (`SELECT ... FOR UPDATE`)
  3. Validasi: split masih `pending` atau `partial`
  4. Kalau ARK:
     - Lock customer row
     - Validasi saldo `>= p_ark_coins`
     - Deduct ARK
     - Log `pos_xp_transactions`
  5. Insert `pos_split_payments`
  6. Update split row: `amount_paid`, `change_amount`, `status`, `payment_method`, `paid_at`
  7. Cek: semua splits di order ini `paid`?
     - Ya → update order: `payment_status = 'paid'`, `completed_at = now()`
     - Tidak → update order: `payment_status = 'partially_paid'`
  8. Insert pos_order_status_history "payment_received"
  9. `COMMIT`

---

## 8. Integrasi dengan Existing System

| Komponen | Dampak | Solusi |
|----------|--------|--------|
| `pos_create_order_transaction` | Tidak diubah | RPC baru untuk split, lama tetap jalan single-payment |
| `cashier-new/page.tsx` | Modal baru + state split | Tambah `SplitBillModal` sebelum `PaymentModal`. `usePosCheckout` dapat flag `isSplit`. |
| `CartPanel.tsx` | Tombol "Split Bill" | Tambah button, tidak ganggu layout existing. |
| `PaymentModal.tsx` | Dipakai per split | Total/amount_paid dikirim via prop, reusable. |
| Kitchen print | Tetap 1x | Print logic tetap di `handleCreateOrder` (order creation), tidak di split payment. |
| `orders/page.tsx` | Detail order perlu tab "Split" | Tambah section splits di OrderDetail dialog. |

---

## 9. Edge Cases & Penanganan

| Skenario | Penanganan |
|----------|------------|
| Split #1 bayar ARK kurang saldo | Transaksi rollback → error ke UI: "Saldo ARK Andi tidak mencukupi" |
| Kasir salah input jumlah split | Bisa cancel split individual sebelum paid |
| Total split ≠ total order karena rounding | Front-end validasi sebelum kirim. Back-end juga re-calculate & reject mismatch. |
| Customer nambah pesanan setelah split | **Phase 1 tidak didukung.** UI matikan tombol "Split Bill" kalau order sudah tersimpan. Edit order = cancel split → buat order baru. |
| Split pakai QRIS | Simpan `reference_number` di `pos_split_payments`. Proses callback bank tetap 1 referensi (tidak multi-QRIS per split, kecuali Phase 2). |
| Semua split paid, tapi ada yang void/refund | Phase 2: refund per split. Phase 1: refund seluruh order saja. |

---

## 10. Implementation Phases

### Phase 1: Split Sama Rata (1–2 hari implementasi)
- [ ] Migration schema SQL (`005_pos_split_bill_schema.sql`)
- [ ] RPC `pos_create_split_order_transaction` (equal split only, no per-item)
- [ ] RPC `pos_pay_split_transaction` (support cash + ARK)
- [ ] API: `POST /api/pos/orders` extended untuk splits
- [ ] API: `POST /api/pos/orders/[id]/splits/[splitId]/pay`
- [ ] API: `GET /api/pos/orders/[id]/splits`
- [ ] Komponen `SplitBillModal` (equal split config)
- [ ] Halaman / Screen `SplitPaymentView` (list split + pay each)
- [ ] Update `CartPanel` (tambah tombol Split Bill)
- [ ] Update `usePosCheckout` (flag split vs single)

### Phase 2: Split Per Item + Custom Nominal
- [ ] Drag-and-drop mapping item ke split
- [ ] Validasi custom nominal + tax/discount prorate
- [ ] History / audit split per item

### Phase 3: Refund & Lanjutan
- [ ] Refund per split
- [ ] Re-print struk per split
- [ ] Multi-QRIS (bisa generate QRIS per split)

---

## 11. Kesimpulan & Saran

**Rekomendasi awal:** Langsung eksekusi **Phase 1 (Split Sama Rata)**. Ini:
- Paling sering dipakai di F&B Indonesia
- Paling sedikit kompleksitas database & state
- Dapat jalan dalam 1–2 sesi pengembangan
- Tidak menyentuh kitchen flow yang sudah stabil

Setelah Phase 1 stabil, baru naik ke Phase 2 (Per Item) karena itu memerlukan UI drag-drop atau assignment yang lebih kompleks.

---

*Disusun oleh AI assistant untuk review tim Arkiv OS.*
