# 🔍 Analisis Module POS — Repository Taletpool

> **Lokasi:** `/Users/ilham/Desktop/talentpool/src/app/dashboard/pos/*` + API `/api/pos/*`  
> **Stack:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS + Supabase (PostgreSQL) + shadcn/ui  
> **Analisis dilakukan:** 2026-05-18

---

## 📁 Struktur File POS

```
src/
├── app/dashboard/pos/
│   ├── layout.tsx              # Navigasi horizontal POS (Dashboard, Produk, Kasir, Pesanan, Reservasi, Topup)
│   ├── page.tsx                # Dashboard POS (⚠️ semua data masih MOCK)
│   ├── cashier-new/page.tsx    # 🏠 Halaman kasir utama — 1041 baris, single file
│   ├── orders/page.tsx         # Riwayat transaksi + detail order + payment modal
│   ├── products/page.tsx       # Manajemen produk
│   ├── reservation/page.tsx   # Reservasi meja
│   └── topup/page.tsx         # Topup ARK Coin
│
├── app/api/pos/
│   ├── products/route.ts       # GET/POST pos_products + variants + modifiers
│   ├── orders/route.ts         # GET/POST pos_orders + pos_order_items
│   ├── orders/[id]/route.ts   # GET/PATCH detail order + status history
│   ├── customers/route.ts    # GET/POST pos_customers
│   ├── dashboard/route.ts      # Statistik aggregasi
│   ├── reservations/route.ts  # CRUD reservasi
│   └── topup/route.ts        # Proses topup ARK Coin
│
├── components/pos/
│   ├── CartPanel.tsx           # Panel kanan: daftar item, summary, tombol bayar
│   └── ProductPanel.tsx        # (Sepertinya tidak terpakai — ada versi inline di cashier-new)
│
├── lib/pos-api.ts              # Client API wrapper untuk semua endpoint POS
│
└── types/index.ts              # Type definitions (shared dengan HRIS & Purchasing)
```

---

## 🏗️ Arsitektur Data Flow

```
┌─────────────┐     HTTP/JSON      ┌─────────────┐     SQL/RPC      ┌─────────────┐
│   Next.js   │ ──────────────────>│   API Route  │ ─────────────────>│  Supabase   │
│   Frontend  │ <──────────────────│   (Edge)     │ <────────────────│  PostgreSQL │
│  (App Dir)  │                    │             │                  │             │
└─────────────┘                    └─────────────┘                  └─────────────┘
       │
       ├── cashier-new/page.tsx
       │   ├── Cart state (useState)
       │   ├── Payment modal
       │   ├── NFC simulation
       │   └── Print receipt (window.open + CSS 58mm)
       │
       ├── orders/page.tsx
       │   ├── Order listing & filtering
       │   ├── Payment pending orders
       │   └── Receipt print preview
       │
       └── pos-api.ts
           ├── getProducts() / getCustomers()
           ├── createOrder() / getOrders() / updateOrderStatus()
           └── processTopup()
```

---

## 🗄️ Skema Database (Supabase)

Tabel yang digunakan module POS:

| Tabel | Relasi | Keterangan |
|-------|--------|------------|
| `pos_products` | 1:N → `pos_product_variants` | Master produk |
| | 1:N → `pos_product_modifiers` → `pos_modifier_groups` | Modifier groups |
| `pos_modifier_groups` | 1:N → `pos_modifiers` | Pilihan tambahan (extra topping, level pedas, dll) |
| `pos_categories` | 1:N ← `pos_products` | Kategori menu |
| `pos_customers` | 1:N ← `pos_orders` | Data pelanggan + membership tier + ARK balance |
| `pos_orders` | 1:N → `pos_order_items` | Header transaksi |
| | N:1 ← `pos_customers` | |
| `pos_order_items` | N:1 ← `pos_orders` | Detail item (termasuk variants & modifiers JSON) |
| `pos_order_status_history` | N:1 ← `pos_orders` | Audit trail perubahan status |
| `pos_xp_transactions` | N:1 ← `pos_customers` | Riwayat XP |

### ERD Sederhana

```
pos_categories ||--o{ pos_products : "has"
pos_products ||--o{ pos_product_variants : "variants"
pos_products ||--o{ pos_product_modifiers : "links"
pos_product_modifiers }o--|| pos_modifier_groups : "group"
pos_modifier_groups ||--o{ pos_modifiers : "contains"
pos_customers ||--o{ pos_orders : "places"
pos_orders ||--o{ pos_order_items : "contains"
pos_orders ||--o{ pos_order_status_history : "tracks"
pos_customers ||--o{ pos_xp_transactions : "earns"
```

---

## 🔄 Flow Fitur Utama

### 1. Transaksi Penjualan (Cashier Flow)

```
[Scan/Click Produk] 
    ↓
[Customization Modal] ──> Pilih Variant + Modifier + Qty + Notes
    ↓
[Add to Cart] ──> Cart state diuseState (frontend only)
    ↓
[Pilih Customer] ──> Guest / Member (tier: bronze/silver/gold/platinum)
    ↓
[Hitung Total] ──> Subtotal - Diskon(tier) + PPN(10% opted-in) - ARK Coin
    ↓
[Bayar] ──> Cash / QRIS / Credit Card / ARK Coin (NFC tap)
    ↓
[createOrder() API] ──> Insert pos_orders + pos_order_items
    ↓
[Kurangi ARK Coin] ──> RPC update_ark_coin_balance()
    ↓
[Tambah XP] ──> RPC calculate_xp_earned() + update pos_customers
    ↓
[Print Struk] ──> window.open() dengan CSS thermal 58mm/72mm
    ↓
[Reset Cart] ──> State kembali kosong
```

### 2. Order Lifecycle

```
    ┌─────────┐
    │  DRAFT  │  <-- Cart di frontend (belum createOrder)
    └────┬────┘
         │ createOrder()
         ↓
    ┌─────────┐     ┌─────────────┐
    │ PENDING │────>│  PREPARING  │<-- Kitchen mulai masak
    └────┬────┘     └──────┬──────┘
         │                 │
         │ bayar           │ ready
         ↓                 ↓
    ┌─────────┐        ┌─────────┐
    │COMPLETED│        │  READY  │<-- Siap diambil/saji
    └─────────┘        └─────────┘
         │
         │ refund/cancel (belum diimplementasi UI)
         ↓
    ┌─────────┐
    │CANCELLED│
    └─────────┘
```

### 3. Membership & Loyalty Flow

```
Customer (pos_customers)
├── membership_tier: bronze | silver | gold | platinum
├── ark_coin_balance: nominal Rupiah (1 ARK = Rp 1.000)
├── total_xp, current_xp
└── visit_count

Diskon otomatis berdasar tier:
├── Platinum: 15%
├── Gold:     10%
├── Silver:   5%
└── Bronze:   0%
```

---

## ✅ Strengths (Yang Bagus)

1. **Modularisasi API Client** (`lib/pos-api.ts`)  
   Semua fetch terpusat dengan type-safe interfaces.

2. **Relasi Database Lengkap**  
   Variants, modifier groups, dan modifiers sudah well-structured.

3. **Fitur Loyalty & Gamification**  
   Tiered membership + XP system + ARK Coin = engagement baik untuk F&B.

4. **Print Receipt**  
   Window-based thermal printing dengan CSS 58mm — simple dan cross-platform.

5. **Order Type Support**  
   Dine-in, Takeaway, Delivery, Self-order dengan table selection.

6. **NFC Simulation**  
   Hidden input field menangkap HID keyboard input dari NFC reader — pragmatic.

---

## ⚠️ Critical Issues & Bugs

### 🔴 A. Data Integrity — **Tidak Ada Transaksi Database**

Lokasi: `src/app/api/pos/orders/route.ts` (POST handler)

```typescript
// Step 1: Insert order
const { data: order, error: orderError } = await supabase.from('pos_orders').insert({...});

// Step 2: Insert items
const { error: itemsError } = await supabase.from('pos_order_items').insert(itemsData);

// Step 3: Deduct ARK coins
await supabase.rpc('update_ark_coin_balance', {...});

// Step 4: Add XP
await supabase.from('pos_customers').update({...}).eq('id', customer_id);

// If ANY step fails mid-way = data corruption!
// Order exists but items don't exist. Or ARK deducted but order failed.
```

**Rekomendasi:** Gunakan Supabase RPC function dengan `BEGIN...COMMIT` block:
```sql
CREATE OR REPLACE FUNCTION pos_create_order(...)
RETURNS json
LANGUAGE plpgsql
AS $$
BEGIN
  -- Insert order
  -- Insert items
  -- Update ARK balance
  -- Update XP
  COMMIT;
EXCEPTION WHEN OTHERS THEN
  ROLLBACK;
  RAISE;
END;
$$;
```

### 🔴 B. XP Calculation Bug — **Overwrite Total XP**

Lokasi: `src/app/api/pos/orders/route.ts` (baris ~165-175)

```typescript
await supabase.from('pos_customers').update({
  total_xp: xp_earned,      // ❌ BUG! Ini OVERWRITE, bukan nambah
  current_xp: xp_earned,    // ❌ BUG! Seharusnya current_xp + xp_earned
  visit_count: 1,           // ❌ BUG! Jadi 1 terus
}).eq('id', customer_id);
```

**Seharusnya:**
```typescript
.update({
  total_xp: customerData.total_xp + xp_earned,
  current_xp: customerData.current_xp + xp_earned,
  visit_count: customerData.visit_count + 1,
})
```

### 🔴 C. No Stock Validation / Deduction

Komentar di kode:
```typescript
// 5. Deduct inventory (if products have inventory tracking enabled)
// This would call a Supabase function or handle in application layer
// For now, we'll skip this and implement later
```

**Risiko:** Bisa terjadi **overselling** — produk habis tapi tetap bisa checkout.

### 🔴 D. Cart State Hanya di Frontend (Tidak Persisted)

Jika browser refresh di tengah transaksi = cart hilang total.  
Tidak ada `localStorage` sync atau server-side cart session.

### 🟡 E. Security Issues

1. **Products API tanpa autentikasi**
   ```typescript
   // GET /api/pos/products — tidak ada getPosSession() check!
   ```
   Semua produk bisa di-fetch tanpa login.

2. **Server tidak re-validasi perhitungan total**  
   Frontend kirim `subtotal`, `discount_amount`, `tax_amount`, `total_amount`.  
   Server hanya `Number()` konversi tanpa re-calculate.  
   **Client bisa manipulasi harga!**

3. **SQL Injection Potential di Search (low risk via supabase client)**
   ```typescript
   query = query.ilike('name', `%${search}%`);
   ```
   Supabase JS client menggunakan parameterized query, tapi tetap best practice pakai sanitasi.

### 🟡 F. Code Quality — `cashier-new/page.tsx` Terlalu Besar

| Metrik | Nilai |
|--------|-------|
| Baris kode | 1,041+ |
| Ukuran file | ~50KB |
| Responsibilities | UI rendering, Cart state, Payment logic, NFC handling, Print logic, Customization modal |

**Single Responsibility Principle (SRP) violation.**

Harusnya dipecah menjadi:
- `hooks/usePosCart.ts` — cart state management
- `hooks/usePosPayment.ts` — payment flow
- `components/pos/ProductGrid.tsx` — product display
- `components/pos/CustomizationModal.tsx` — variant/modifier selector
- `components/pos/PaymentModal.tsx` — payment UI
- `components/pos/NFCReader.tsx` — NFC handling
- `components/pos/ReceiptPrinter.tsx` — print logic

### 🟡 G. Dashboard Mock Data

`src/app/dashboard/pos/page.tsx` seluruhnya menggunakan mock data:
```typescript
const mockStats = { ... };
const mockTopProducts = [ ... ];
const mockLowStock = [ ... ];
const mockRecentOrders = [ ... ];
```

Tidak ada koneksi ke API sama sekali.

---

## 📊 Coverage Fitur vs Best Practice POS

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Product Master | ✅ | CRUD + variants + modifiers |
| Cart Management | ✅ | Qty, notes, variant, modifier |
| Checkout | ✅ | 4 payment methods |
| Thermal Receipt | ✅ | CSS-based print |
| Customer Loyalty | ✅ | Tiered membership |
| ARK Coin / E-wallet | ✅ | Custom currency |
| XP System | ⚠️ | Ada tapi ada bug overwrite |
| Shift Management | ❌ | Tidak ada shift open/close |
| Stock Deduction | ❌ | Comment: "implement later" |
| Split Payment | ❌ | Hanya single payment method |
| Refund/Return | ❌ | Tidak ada |
| Hold/Park Order | ❌ | Tidak ada |
| Kitchen Display System | ❌ | Tidak ada |
| Offline Mode | ❌ | Tidak ada |
| Multi-Outlet | ❌ | Tidak ada |
| Audit Trail | ⚠️ | Ada `pos_order_status_history` tapi `from_status: null` |

---

## 🚀 Rekomendasi Perbaikan Prioritas

### Priority 1 — Critical (Sebelum Production)
1. **Wrap order creation dalam database transaction** (Supabase RPC)
2. **Fix XP update query** — gunakan increment, bukan overwrite
3. **Re-calculate total di server** sebelum insert — jangan percaya client
4. **Tambah stock validation** sebelum checkout + deduct stock on success
5. **Tambah authentication** ke `/api/pos/products`

### Priority 2 — Architecture
6. **Refactor `cashier-new/page.tsx`** pecah jadi custom hooks + components terpisah
7. **Implement `useReducer` atau Zustand** untuk cart state (lebih scalable dari useState)
8. **Persist cart ke localStorage** agar refresh tidak hilang

### Priority 3 — Features
9. **Shift Management** — `pos_shifts` tabel + open/close shift flow
10. **Split Payment** — 50% cash + 50% QRIS support
11. **Kitchen Display** (opsional) — websocket/ polling order status
12. **Refund UI** — partial dan full refund dengan stok kembali
13. **Dashboard aktual** — ganti mock data dengan query aggregasi ke Supabase

---

## 📝 Contoh Refactor: Extract Cart Hook

```typescript
// hooks/usePosCart.ts — Rekomendasi
import { useReducer, useCallback } from 'react';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  variantName?: string;
  modifierNames?: string[];
  notes?: string;
}

type CartAction =
  | { type: 'ADD_ITEM'; payload: CartItem }
  | { type: 'UPDATE_QTY'; id: string; delta: number }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'CLEAR_CART' }
  | { type: 'HYDRATE'; items: CartItem[] };

function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.find(
        i => i.id === action.payload.id && 
             i.variantName === action.payload.variantName &&
             JSON.stringify(i.modifierNames) === JSON.stringify(action.payload.modifierNames)
      );
      if (existing) {
        return state.map(i =>
          i === existing ? { ...i, quantity: i.quantity + action.payload.quantity } : i
        );
      }
      return [...state, action.payload];
    }
    case 'UPDATE_QTY':
      return state
        .map(i => i.id === action.id ? { ...i, quantity: Math.max(0, i.quantity + action.delta) } : i)
        .filter(i => i.quantity > 0);
    case 'REMOVE_ITEM':
      return state.filter(i => i.id !== action.id);
    case 'CLEAR_CART':
      return [];
    case 'HYDRATE':
      return action.items;
    default:
      return state;
  }
}

export function usePosCart() {
  const [items, dispatch] = useReducer(cartReducer, [], (initial) => {
    if (typeof window === 'undefined') return initial;
    const saved = localStorage.getItem('pos_cart');
    return saved ? JSON.parse(saved) : initial;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('pos_cart', JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: CartItem) => dispatch({ type: 'ADD_ITEM', payload: item }), []);
  const updateQty = useCallback((id: string, delta: number) => dispatch({ type: 'UPDATE_QTY', id, delta }), []);
  const removeItem = useCallback((id: string) => dispatch({ type: 'REMOVE_ITEM', id }), []);
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR_CART' }), []);

  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return { items, addItem, updateQty, removeItem, clearCart, subtotal };
}
```

---

## ✅ Kesimpulan

Module POS di repo ini sudah memiliki **fitur core yang lengkap** untuk F&B (dine-in, takeaway, delivery, variants, modifiers, loyalty, ARK coin, receipt print). Namun ada **beberapa bug kritis dan debt teknis** yang perlu diperbaiki sebelum production:

| Aspek | Rating | Catatan |
|-------|--------|---------|
| Fitur | ⭐⭐⭐⭐☆ | Lengkap untuk MVP F&B |
| Code Quality | ⭐⭐☆☆☆ | File terlalu besar, mixed concerns |
| Data Safety | ⭐⭐☆☆☆ | Tidak ada DB transaction, stock belum dikurangi |
| Security | ⭐⭐⭐☆☆ | API products tanpa auth, client calculation trusted |
| UI/UX | ⭐⭐⭐⭐☆ | Clean, responsive, shadcn/ui components |

**Langkah pertama yang paling penting:**  
1. Buat Supabase RPC `pos_create_order` dengan proper transaction  
2. Fix XP overwrite bug  
3. Tambahkan server-side total recalculation  
4. Implementasi stock deduction
