# Penyempurnaan V1 - Arkiv OS

> Dokumentasi perubahan dan rencana perbaikan project Arkiv OS.
> Dibuat: Mei 2026
> Status: **Fase 1 - Step 1.1 Selesai ✅**
> 
> **Build Status**: ✅ **BUILD CLEAN** (Next.js 16.2.3, TypeScript Strict)

---

## Ringkasan Project

- **Nama**: Arkiv OS
- **Stack**: Next.js 16.2.3, React 19, PostgreSQL, Tailwind v4, TypeScript
- **Scope**: ERP Terintegrasi (HRIS, Purchasing, Inventory, POS)
- **Repo**: `/Users/ilham/Desktop/talentpool`

---

## Review Awal (Sebelum Perubahan)

### Masalah Kritis yang Ditemukan
1. `ignoreBuildErrors: true` di `next.config.ts` — **membahayakan production**
2. Banyak route handler pakai tipe `params` lama (bukan `Promise<{ id: string }>`)
3. POS XP overwrite bug (XP direset setiap order)
4. Service Role key dipakai tanpa auth check
5. Rate limiting memory-based (tidak berfungsi di Vercel)
6. Banyak file sampah di root (`FIX-*.sql`, `CHECK-*.sql`, backup folder)

---

## Roadmap Perbaikan

### Fase 1: Security & Stability 🔴 P0
- [x] **1.1**.1 Hapus `ignoreBuildErrors` dari `next.config.ts`
- [x] **1.1**.2 Fix semua API route handler `params` jadi `Promise`
- [x] **1.1**.3 Fix tipe TypeScript di komponen Employee, Candidate, dan API routes
- [x] **1.1**.4 Re-run build sampai bersih tanpa error ✅
- [ ] **1.2**.1 Audit auth di semua API route (ganti `createAdminClient` jadi `createClient`)
- [ ] **1.3**.1 Fix POS XP overwrite bug (jadi accumulate)
- [ ] **1.4**.1 Fix rate limiting (memory → Redis/Upstash)

### Fase 2: Code Quality & Type Safety 🟠 P1
- [ ] **2.1**.1 Basmi semua penggunaan `any` (dashboard, API, dll)
- [ ] **2.2**.1 Pindahin auth redirect ke Server Component / Middleware
- [ ] **2.3**.1 Rapikan error handling pattern jadi konsisten

### Fase 3: Technical Debt Cleanup 🟡 P2
- [ ] **3.1**.1 Pindahkan file SQL di root ke `scripts/fixes/` & `scripts/checks/`
- [ ] **3.2**.1 Hapus folder `pos-ui-backup/` dan file obsolete
- [ ] **3.3**.1 Ganti inline component jadi import dari `components/ui/`

### Fase 4: Performance & Architecture 🟢 P3
- [ ] **4.1**.1 Refactor POS order jadi atomic transaction (PostgreSQL RPC)
- [ ] **4.2**.1 Fix NIP generation race condition (pakai sequence DB)
- [ ] **4.3**.1 Dashboard summary jadi 1 query (bukan 6 endpoint)
- [ ] **4.4**.1 Perluas middleware untuk auth protection

---

## Detail Perubahan yang Sudah Dilakukan

### 1. `next.config.ts`
```diff
 const nextConfig: NextConfig = {
   reactCompiler: true,
-  typescript: { ignoreBuildErrors: true },
 };
```
**Dampak**: Build sekarang akan fail kalau ada TS error. Seharusnya sudah dari awal.

---

### 2. API Route Handler `params` → `Promise`

Di Next.js 16, semua route handler yang menerima `params` wajib pakai tipe `Promise<{ id: string }>`.

**File yang sudah diperbaiki** (update tipe params + await params di body function):

| No | File | Perubahan |
|----|------|-----------|
| 1 | `src/app/api/hris/employee-kpis/[id]/route.ts` | `params: { id: string }` → `params: Promise<{ id: string }>` |
| 2 | `src/app/api/hris/employee-kpis/[id]/progress/route.ts` | GET + POST params jadi Promise |
| 3 | `src/app/api/hris/performance-reviews/[id]/route.ts` | GET + PUT params jadi Promise |
| 4 | `src/app/api/hris/kpi-templates/[id]/route.ts` | GET + PUT + DELETE params jadi Promise |
| 5 | `src/app/api/purchasing/grn/[id]/items/route.ts` | GET + POST params jadi Promise |
| 6 | `src/app/api/purchasing/grn/[id]/qc/route.ts` | GET + POST params jadi Promise |
| 7 | `src/app/api/purchasing/deliveries/[id]/route.ts` | GET + PUT + DELETE params jadi Promise |
| 8 | `src/app/api/pos/orders/[id]/route.ts` | PATCH + GET params jadi Promise |
| 9 | `src/app/api/pos/orders/route.ts` | PATCH dihapus (duplikat, sudah ada di `[id]/route.ts`) |
| 10 | `src/app/api/pos/reservations/route.ts` | PATCH dipindahkan ke `[id]/route.ts` baru |
| 11 | `src/app/api/purchasing/grn/[id]/returnable-items/route.ts` | Interface `Params` diganti jadi tipe inline Promise |
| 12 | `src/app/api/purchasing/returns/[id]/approve/route.ts` | Interface `Params` diganti jadi tipe inline Promise |
| 13 | `src/app/api/purchasing/returns/[id]/reject/route.ts` | Interface `Params` diganti jadi tipe inline Promise |
| 14 | `src/app/api/hris/employees/[id]/route.ts` | Fix import tipe dari `@/types/hris` |

**Pattern perubahan:**
```ts
// Sebelum (❌ ERROR di Next.js 16):
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id; // langsung pakai
}

// Sesudah (✅ BENAR):
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // wajib await dulu
}
```

---

### 3. Struktur File Baru

Dibuat file baru hasil split endpoint:
- `src/app/api/pos/reservations/[id]/route.ts` — berisi PATCH (dipindah dari `route.ts` parent)

---

## Status Build Saat Ini

### ✅ BUILD BERHASIL - May 2026

```bash
$ npm run build

▲ Next.js 16.2.3 (Turbopack)
⚠ The "middleware" file convention is deprecated.
✓ Compiled successfully in 8.7s
  Running TypeScript ...
✓ Type checking ...
✓ Collecting page data ...
✓ Generating static pages (13/13) ...
✓ Collecting build traces ...
✓ Finalizing page optimization ...

Build berhasil tanpa error TypeScript!
```

**Status**: ✅ **BUILD CLEAN** - Semua error TypeScript sudah diperbaiki.

---

## Tugas Berikutnya (Waktu Dilanjutkan)

### Langsung Lanjutkan:

1. **Fix tipe Employee**
   ```ts
   // types/hris.ts sudah punya:
   export interface EmployeeWithRelations extends Employee {
     department?: Department;
     section?: Section;
     job_title?: Position;
     manager?: Employee;
   }
   
   // Di komponen yang pakai data API, import EmployeeWithRelations:
   import type { EmployeeWithRelations } from '@/types/hris';
   ```

2. **Jalankan `npm run build` ulang**
   - Perbaiki error yang muncul satu per satu
   - Pastikan sampai build berhasil tanpa error

3. **Lanjut Fase 1.2 — Audit Auth**
   - Cari semua `createAdminClient` di API routes
   - Pastikan semua endpoint cek session user dulu

---

## Catatan Penting

- **Jangan push ke production** sebelum Fase 1 selesai semua
- Fase 1 menyangkut keamanan dan stabilitas, ini prioritas tertinggi
- Banyak query PostgreSQL di API pakai select join (`department:departments(name)`), sehingga data yang datang punya field nested. Tipe `Employee` dasar tidak punya field ini. Selalu pakai `EmployeeWithRelations` untuk data hasil join.
- Folder `pos-ui-backup/` masih ada di `src/app/dashboard/` — perlu dihapus saat Fase 3.

---

## Perintah Berguna

```bash
# Cari semua file yang masih pakai interface Params lama (kalau ada sisa di lain file)
grep -rn "interface Params" src/app/api --include="*.ts"

# Cari semua penggunaan createAdminClient di API routes
grep -rn "createAdminClient" src/app/api --include="*.ts"

# Build untuk verifikasi
npm run build

# Cari semua any yang masih ada di project
grep -rn ": any" src/app --include="*.ts" --include="*.tsx" | head -50
```

---

*Terakhir diupdate: Mei 2026*
*dilanjutkan dari: Fase 1, Step 1.1 (belum selesai)*
