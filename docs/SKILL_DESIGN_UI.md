# Skill: Arkiv Design System — "Prologue in Wonderland"

> **Skill Rule:** Saat membuat atau mengedit UI untuk project ini, JANGAN gunakan look & feel generik. Setiap tampilan harus ngikutin identitas brand Arkiv / Prologue in Wonderland. Login page (`src/app/(auth)/login/page.tsx`) adalah single source of truth untuk palet warna dan gaya visual.

---

## 1. Filosofi Brand

- **Arkiv OS** = sistem ERP premium dengan feel "Apple-style liquid glass"
- **Prologue in Wonderland** = sub-brand POS/kasir yang ngambil estetika pink/black gradient dengan kesan imajinatif / fairy-tale / wonderland
- **Anti-generik:** Jangan pakai default Tailwind blue (`bg-blue-600`) untuk button/action. Jangan pakai white flat header. Jangan pakai table dengan border hitam tebal.

---

## 2. Color Palette (Single Source of Truth)

### Primary Accents — HOT PINK (BUKAN Biru!)
```
Pink-600: #db2777  (gradient start)
Pink-500: #ec4899  (gradient end / hover)
Pink-800: #be185d  (gradient dark / deep)
Magenta/Neon: #ff00aa (brand text, logo accent)

Gradient button primary: linear-gradient(135deg, #ec4899 0%, #db2777 100%)
Gradient hover primary: linear-gradient(135deg, #db2777 0%, #be185d 100%)
Gradient login hero: linear-gradient(135deg, #db2777 0%, #be185d 50%, #000000 100%)
```

### Background Palette (Soft Pastel Mesh)
```
Page bg: linear-gradient(135deg, #eef2ff 0%, #faf5ff 40%, #f0f9ff 75%, #fef3ff 100%)
Sidebar: #1c1c1e (dark charcoal, BUKAN pure black)
Card glass: rgba(255, 255, 255, 0.70)
Card footer: rgba(248, 250, 252, 0.6)
```

### Text & Surface
```
Main text: #111827 / gray-900
Secondary text: #6b7280 / gray-500
Light accent text: #fbcfe8 (pink-100) untuk di atas gradient gelap
Very light: #fce7f3 (pink-50)
Border super tipis: rgba(209, 213, 219, 0.5) (jangan terlalu kontras)
Input border: rgba(209, 213, 219, 0.6)
Input bg: rgba(255, 255, 255, 0.7)
```

---

## 3. Liquid Glass — The Signature Look

### Cards
```css
background: rgba(255, 255, 255, 0.70);
backdrop-filter: blur(24px) saturate(1.8);
-webkit-backdrop-filter: blur(24px) saturate(1.8);
border: 1px solid rgba(209, 213, 219, 0.35);
box-shadow:
  0 2px 20px rgba(0, 0, 0, 0.04),
  0 1px 4px rgba(0, 0, 0, 0.03),
  inset 0 1px 0 rgba(255, 255, 255, 0.85);
border-radius: ~1rem;
```

### Sidebar Glass Overlay
```css
background: rgba(255, 255, 255, 0.04);
backdrop-filter: blur(4px);
```
Nav items di dalam sidebar:
```css
background: rgba(255, 255, 255, 0.08);
backdrop-filter: blur(5px);
border-radius: 0.5rem;
/* hover */
background: rgba(255, 255, 255, 0.15);
```

---

## 4. Typography

```
Base font: Inter (Google Fonts) — clean, modern, neutral
Accent font: Roundo (Fontshare) — untuk heading / career section saja
Font size: kecil rata-rata, 0.75rem (xs) untuk label uppercase, 0.875rem (sm) input/button
Headings: bold tapi tidak oversized
```

---

## 5. Components Anti-Patterns (JANGAN)

| ❌ Jangan | ✅ Pakai Ini |
|---|---|
| `bg-blue-600` button | `bg-gradient-to-r from-pink-500 to-pink-600` |
| `border-gray-900` table border | `border-[rgba(209,213,219,0.5)]` |
| White flat card tanpa glass | Liquid glass card |
| Pure black sidebar `#000` | Dark charcoal `#1c1c1e` |
| Bold red error box | `text-pink-600 bg-pink-50 border-pink-100` |
| Default gray input | `bg-white/70 border-gray-300/60 focus:ring-pink-500` |
| Oversized shadow (`shadow-lg` biasa) | Multi-layer soft shadow seperti glass |

---

## 6. Iconography

- **Library:** Lucide React (`lucide-react`)
- **Styling:** `h-5 w-5 text-gray-400` di dalam input, `text-white` di dalam button pink
- **Sidebar icons:** `text-white` dengan opacity tinggi

---

## 7. Reference Files (Untuk Dibaca Saat Buat UI)

| File | Fungsi |
|---|---|
| `src/app/(auth)/login/page.tsx` | Warna gradient login page, tipografi, spacing |
| `src/app/globals.css` | Liquid glass overrides, animate, scrollbar |
| `src/app/blue-theme.css` | Sidebar glass, sidebar nav styles |
| `src/app/pink-buttons.css` | Override tombol biru → pink |
| `src/components/ui/button.tsx` | Base button shadcn (base-nova style) |
| `public/logo.png` | Logo "Prologue in Wonderland" untuk POS |

---

## 8. Ceklist Sebelum Kirim Kode UI

- [ ] Button utama pakai gradient pink (`#ec4899` → `#db2777`), BUKAN biru
- [ ] Card pakai backdrop-blur + bg-white/70 + border tipis transparan
- [ ] Page background pakai pastel mesh (soft purple/blue/pink blend)
- [ ] Text label uppercase tipis `text-xs font-medium text-gray-500 uppercase tracking-wide`
- [ ] Input rounded-lg + ring pink saat focus + placeholder gray
- [ ] Tidak ada border gelap tebal di table/component
- [ ] Sidebar (jika ada) gelap `#1c1c1e` dengan glass effect
- [ ] Error state pakai pink-600 / pink-50 (bukan red-600/white)
- [ ] Icons pakai Lucide, size dan warna konsisten

---

## 9. Estetika "Prologue in Wonderland" (POS / Kasir)

- Logo POS: `public/logo.png` (Wonderland themed)
- Harga: ditampilkan sebagai `Rp X (Y ARK)` — 1 ARK = Rp 1000
- Warna tetap ngikut hot pink accent Arkiv
- POS tetap pakai Liquid Glass di modal/form, tp bisa lebih playful dengan gradient dan badge

---

*Skill ini harus aktif setiap kali meng-generate atau meng-edit komponen/page di project Arkiv OS.*
