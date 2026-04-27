# ARK POS - UI Preview Backup

## 📁 Struktur Folder

```
pos-ui-backup/
├── layout.tsx          # Layout dengan navigation bar
├── page.tsx            # Dashboard homepage
├── cashier/            # Halaman Kasir (mock data)
├── products/           # Manajemen Produk
├── orders/             # Order Management
├── reservation/        # Reservasi Meja
├── topup/              # Topup Ark Coin
└── recipe-builder/     # Recipe Builder
```

## 🎯 Purpose

Folder ini adalah **backup UI POS dengan mock data** untuk:

- **Preview/Design Review** - Show ke stakeholder tanpa perlu backend
- **Reference** - Sebagai contoh implementasi UI sebelum connect ke API
- **Testing** - Test UX flow tanpa dependency database

## 🚀 Akses

Buka di browser:

```
http://localhost:3000/dashboard/pos-ui-backup
```

## 🎨 Navigation

- **Dashboard** - Overview stats, top products, low stock, recent orders
- **Produk** - CRUD products, variants, modifiers
- **Kasir** - Point of Sale dengan cart, customer search, payment
- **Pesanan** - List orders dengan filter status
- **Reservasi** - Booking meja dengan WhatsApp reminder
- **Topup** - Topup Ark Coin untuk customers
- **Recipe** - Formula bahan baku per produk

## 📊 Mock Data

Semua halaman menggunakan **mock data hardcoded**:

- 8 products (Makanan, Minuman, Snack)
- 5 customers (Regular, VIP, Premium, Owner)
- 8 tables (Meja 1-8)
- Sample orders & reservations

## ⚠️ Important

**Folder ini TIDAK connect ke backend/database.**

Untuk production version dengan API, gunakan:
```
/dashboard/pos          # Connect ke /api/pos/*
```

## 🔄 Sync dengan Production

Jika ada perubahan UI di `/dashboard/pos`, update juga backup ini:

```bash
cp -r src/app/dashboard/pos/cashier src/app/dashboard/pos-ui-backup/cashier
# dst untuk folder lain
```

Atau biarkan sebagai snapshot design awal.

---

**Status:** ✅ UI Preview Ready
**Next:** Connect ke backend API di folder `/dashboard/pos` yang asli
