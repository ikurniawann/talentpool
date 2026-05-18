---
name: arkiv-ui-design
description: Enforces the Arkiv OS "Prologue in Wonderland" liquid glass design system with hot pink gradients, glassmorphism cards, and soft pastel mesh backgrounds. Use whenever creating or modifying any React component, page, or layout in the Arkiv OS project. Prevents generic blue buttons, flat white cards, and dark heavy borders.
---

# Arkiv UI Design Skill

## Overview

Arkiv OS is an ERP system for Aapex Technology with a premium "Apple-style liquid glass" aesthetic. The POS sub-brand uses "Prologue in Wonderland" identity. Every UI element must match this visual language — no generic Tailwind defaults.

## Color Palette (MANDATORY)

### Primary — HOT PINK (NEVER blue)
- `#db2777` — Pink-600 (gradient start)
- `#ec4899` — Pink-500 (gradient end / hover)
- `#be185d` — Pink-800 (deep gradient)
- `#ff00aa` — Magenta neon (logo text, brand)
- Primary button gradient: `linear-gradient(135deg, #ec4899 0%, #db2777 100%)`
- Hover gradient: `linear-gradient(135deg, #db2777 0%, #be185d 100%)`

### Background — Soft Pastel Mesh
- Page background: `linear-gradient(135deg, #eef2ff 0%, #faf5ff 40%, #f0f9ff 75%, #fef3ff 100%)`
- Sidebar: `#1c1c1e` (dark charcoal, NOT pure black)
- Card glass: `rgba(255, 255, 255, 0.70)`
- Card footer: `rgba(248, 250, 252, 0.6)`

### Borders & Surfaces
- Border: `rgba(209, 213, 219, 0.5)` (very light, subtle)
- Input border: `rgba(209, 213, 219, 0.6)`
- Input bg: `rgba(255, 255, 255, 0.7)`
- Error state: `text-pink-600 bg-pink-50 border-pink-100` (NOT red-600)

## Liquid Glass Card Rules

```css
background: rgba(255, 255, 255, 0.70);
backdrop-filter: blur(24px) saturate(1.8);
border: 1px solid rgba(209, 213, 219, 0.35);
box-shadow:
  0 2px 20px rgba(0, 0, 0, 0.04),
  0 1px 4px rgba(0, 0, 0, 0.03),
  inset 0 1px 0 rgba(255, 255, 255, 0.85);
border-radius: 1rem;
```

## Typography
- Base: Inter (Google Fonts)
- Accent: Roundo (Fontshare, career section only)
- Label style: `text-xs font-medium text-gray-500 uppercase tracking-wide mb-2`
- Headings: bold but not oversized

## Iconography
- Library: Lucide React (`lucide-react`)
- Input icons: `h-5 w-5 text-gray-400`
- Sidebar icons: `text-white`

## Forbidden Patterns (Anti-Generic)

| ❌ NEVER | ✅ ALWAYS |
|---|---|
| `bg-blue-600` button | Pink gradient: `linear-gradient(135deg, #ec4899, #db2777)` |
| Flat white card (`bg-white shadow-lg`) | Liquid glass card with backdrop blur |
| `border-gray-900` / thick dark borders | `rgba(209, 213, 219, 0.5)` subtle borders |
| Pure black sidebar `#000000` | `#1c1c1e` dark charcoal with glass overlay |
| Default red error `bg-red-50` | `bg-pink-50 text-pink-600` |
| Hard shadow | Multi-layer soft shadow |
| Generic gray input | `bg-white/70 border-gray-300/60 focus:ring-pink-500` |

## POS / Prologue in Wonderland Notes
- Logo: `public/logo.png`
- Currency display: `Rp X (Y ARK)` where 1 ARK = Rp 1000
- Can be more playful with gradients and badges
- Still MUST use liquid glass in modals/forms

## Reference Files
- `src/app/(auth)/login/page.tsx` — Login page as design reference
- `src/app/globals.css` — Glass overrides, animations
- `src/app/pink-buttons.css` — Button color overrides
- `src/app/blue-theme.css` — Sidebar glass styles
- `src/components/ui/button.tsx` — Base button component

## Checklist Before Sending UI Code
- [ ] Primary button uses pink gradient
- [ ] Card uses backdrop-blur + bg-white/70 + subtle border
- [ ] Page background is pastel mesh gradient
- [ ] Labels are `text-xs uppercase tracking-wide text-gray-500`
- [ ] Inputs are rounded-lg with pink focus ring
- [ ] No thick dark borders on tables
- [ ] Sidebar is `#1c1c1e` with glass
- [ ] Error states use pink (not red)
- [ ] All icons are Lucide with consistent sizing
- [ ] NO `bg-blue-600` anywhere
