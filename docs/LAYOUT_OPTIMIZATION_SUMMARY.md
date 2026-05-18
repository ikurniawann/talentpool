# Layout Optimization - Compact & Precise UI

**Date:** 2026-04-24  
**Status:** In Progress  
**Goal:** Apply consistent, compact, balanced layout to all forms

---

## ✅ COMPLETED PAGES

### 1. Raw Materials New
**File:** `raw-materials/new/page.tsx`
**Layout:** 2-column balanced grid
**Cards:** Informasi Dasar + Satuan (left), Pengaturan Stok (right)
**Status:** ✅ DONE

### 2. Raw Materials Edit  
**File:** `raw-materials/[id]/edit/page.tsx`
**Layout:** Same as New page
**Status:** ✅ DONE

---

## 📋 PENDING PAGES (~6 pages)

### Priority 1 - Similar Structure (Easy)
1. **Products New** - 2 columns: Info + BOM (left), Pricing (right)
2. **Products Edit** - Same as New
3. **Suppliers New** - Already has 2-column grid, needs compact spacing
4. **Suppliers Edit** - Same as New

### Priority 2 - Medium Complexity
5. **Price List New** - Needs restructure for balance
6. **Price List Edit** - Same as New

---

## 🎨 DESIGN SPECIFICATIONS

### Grid System
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Left Column */}
  <div className="space-y-6">
    {/* Cards stacked vertically */}
  </div>
  
  {/* Right Column */}
  <Card>
    {/* Full height card */}
  </Card>
</div>
```

### Component Sizes
- **Inputs:** `h-9 text-sm` (compact)
- **Combobox:** `h-9 text-sm` (matching inputs)
- **Spacing:** `space-y-1.5` (tighter than default space-y-2)
- **Card Headers:** `pb-3` (reduced padding)
- **Titles:** `text-base` (smaller than default)
- **Icons:** `w-4 h-4` (smaller than w-5 h-5)

### Visual Balance
- Equal column widths (50%-50%)
- Cards on left stacked to match right card height
- Consistent padding and margins throughout
- No empty/white spaces

---

## 📊 BENEFITS

### User Experience
✓ More content visible above fold  
✓ Reduced scrolling  
✓ Faster data entry (compact fields)  
✓ Professional appearance  

### Developer Experience
✓ Consistent pattern across all forms  
✓ Easy to maintain  
✓ Reusable layout components  
✓ Clear structure  

### Performance
✓ Smaller DOM (less nesting)  
✓ Cleaner CSS (consistent classes)  
✓ Better mobile responsiveness  

---

## 🔧 IMPLEMENTATION CHECKLIST

For each page:
- [ ] Change grid to 2-column balanced
- [ ] Update card structure
- [ ] Reduce input heights to h-9
- [ ] Change text size to text-sm
- [ ] Tighten spacing to space-y-1.5
- [ ] Reduce icon sizes to w-4 h-4
- [ ] Shorten placeholder text
- [ ] Remove redundant helper text
- [ ] Test on desktop & mobile

---

**Progress:** 2/8 pages (25%)  
**Estimated Time Remaining:** ~30 minutes

**Last Updated:** 2026-04-24 11:30 AM WIB
