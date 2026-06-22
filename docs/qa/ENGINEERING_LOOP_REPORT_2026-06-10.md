# Engineering Loop Report - Arkiv Projects

Tanggal: 2026-06-10
Branch: `codex/pos-profit-readme`
Scope: Arkiv OS, POS, Purchasing/Production, HRIS, CRM, Inventory, shared UI, deployment readiness.

## Objective

Menjalankan loop engineering menyeluruh:

1. Observe baseline repo dan deploy error.
2. Diagnose build/lint/type/test failure.
3. Patch blocker yang aman dan high-signal.
4. Verify ulang dengan command lokal.
5. Dokumentasikan hasil, risiko, dan next loop.

## Baseline

Repo awal berada di branch `codex/pos-profit-readme` dan clean terhadap remote.

Commit sebelum loop:
- `0c5d95a Make Supabase browser client build safe`
- `c47d28e Improve POS profit report collaboration docs`

Deploy error yang masuk:

```text
Error occurred prerendering page "/login"
Error: @supabase/ssr: Your project's URL and API key are required to create a Supabase client!
Export encountered an error on /(auth)/login/page: /login
```

Diagnosis:
- Vercel build menjalankan prerender untuk `/login`.
- `src/lib/supabase/client.ts` membuat Supabase browser client saat module dievaluasi build.
- Environment Vercel untuk branch/preview tidak menyediakan `NEXT_PUBLIC_SUPABASE_URL` atau `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Risiko lanjutan juga ada di server helper karena root `/` memakai `src/lib/supabase/server.ts`.

## Changes Applied

### Deployment / Supabase

Files:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`

Perubahan:
- Browser Supabase client sekarang build-safe saat env publishable belum tersedia pada prerender server.
- Server Supabase client juga memakai placeholder build-safe bila env publishable kosong.
- Runtime real tetap butuh env Vercel yang benar agar auth/data Supabase berjalan.

Required Vercel env:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

### POS API Type Compatibility

Files:
- `src/app/api/pos/orders/[id]/void/route.ts`
- `src/app/api/pos/shifts/[id]/close/route.ts`

Perubahan:
- Route handler dynamic params disesuaikan dengan Next.js 16 validator: `params` sebagai `Promise`.
- Error handling void order diubah dari `any` ke `unknown`.
- Close shift aggregation row diberi tipe eksplisit.

Dampak:
- Dua error `.next/types/validator.ts` untuk POS route handler hilang dari `npx tsc --noEmit`.

### Purchasing API Type Fixes

Files:
- `src/app/api/purchasing/dashboard/route.ts`
- `src/app/api/purchasing/delivery/route.ts`
- `src/app/api/purchasing/grn/route.ts`

Perubahan:
- Monthly trend accumulation dipaksa numeric agar tidak menjumlahkan `string | number`.
- Delivery create sekarang guard `po` sebelum mengambil `po.supplier_id`.
- GRN PO item type ditambah `harga_satuan` dan `unit_price`, lalu unit cost di-normalize ke number.

Dampak:
- Error TS awal di tiga route Purchasing tersebut hilang dari urutan awal typecheck.

## Verification Results

### Passing

```bash
npx eslint src/lib/supabase/client.ts src/lib/supabase/server.ts
```

Status: passed.

```bash
npx eslint 'src/app/api/pos/orders/[id]/void/route.ts' 'src/app/api/pos/shifts/[id]/close/route.ts'
```

Status: passed.

```bash
npm test
```

Status: passed.

Result:

```text
Test Files  2 passed (2)
Tests       39 passed (39)
```

### Still Failing

```bash
npm run lint
```

Status: failed.

Summary:

```text
913 problems
521 errors
392 warnings
```

Major categories:
- `@typescript-eslint/no-explicit-any` across API routes, POS utilities, HRIS, Purchasing modules, and tests.
- React Compiler lint errors such as synchronous `setState` in effects and static component creation during render.
- CommonJS `require()` lint errors in `scripts/*.js`.
- Unused variables in many older modules.

```bash
npx tsc --noEmit --pretty false
```

Status: failed.

Current first remaining blockers:
- `src/app/dashboard/(dashboard)/layout.tsx`: nav icon type mismatch.
- Purchasing pages: PO approval total field, delivery new response id, GRN variable typo, product/BOM/card type mismatch, QC null index.
- POS backup pages: `icon-sm` button variant and tier casing.
- POS orders page: Base UI `asChild` mismatch and implicit `any`.
- Arkiv desktop: stale discriminated union branches for removed `module` type.
- Voice assistant: missing Web Speech API type declarations.
- Shared UI: missing `react-day-picker`, missing `@radix-ui/react-label`, missing card/button exports.
- Purchasing forms: Zod resolver type mismatch.
- Swagger client: missing declaration for `swagger-ui-react`.

### Build

`npm run build` was attempted locally but did not progress past:

```text
Creating an optimized production build ...
```

The process was stopped to avoid leaving a long-running build on the machine.
Vercel build log showed compile can complete in CI, and the observed CI failure was prerender Supabase env handling.

## Module Status

### Arkiv OS Desktop

Status: partially healthy.

Known blockers:
- Type errors in `src/components/arkiv/arkiv-os-desktop.tsx` around stale `module` branch and `logo/logoClassName` fields.
- Voice assistant needs Web Speech API type declarations.

### POS

Status: active development, main POS report work is in place.

Healthy:
- POS Profit Report route and page have scoped lint passing from previous loop.
- POS route validator issues for void and shift close fixed.

Known blockers:
- `src/app/dashboard/pos/orders/page.tsx` has Base UI trigger `asChild` type mismatch and implicit `any`.
- `src/app/dashboard/pos/page.tsx` has API response type mismatch.
- `src/app/dashboard/pos-ui-backup/*` has multiple stale type issues.

### Purchasing / Production / Inventory

Status: feature-rich but type debt is high.

Healthy:
- Dashboard monthly trend numeric accumulation fixed.
- Delivery create null PO guard fixed.
- GRN unit cost type fixed.

Known blockers:
- Multiple Purchasing pages still fail typecheck.
- Inventory valuation rows allow optional IDs where UI type requires string.
- Purchasing form resolver types need a dedicated pass.

### HRIS / Performance

Status: tests pass, but type/lint debt remains.

Known blockers:
- Missing card exports used by HRIS components.
- Performance chart callback has possibly undefined percent.
- Many API routes use explicit `any`.

### CRM / Loyalty / XP

Status: not directly patched in this loop.

Known blockers:
- `src/lib/crm/loyalty-engine.ts` returns `{ id, xp }` where type expects `{ id, xp_points }`.
- XP stats card passes unsupported `indicatorClassName` to progress primitive.

### Shared UI / Dependencies

Status: needs cleanup before full typecheck can be a merge gate.

Known blockers:
- `react-day-picker` is imported but not installed or not declared.
- `@radix-ui/react-label` is imported but not installed.
- `buttonVariants`, `CardDescription`, and `CardAction` are referenced but not exported by current local UI components.

## Recommended Next Engineering Loops

### Loop 1 - Deployment stabilization

1. Confirm Vercel preview redeploy after the latest commits.
2. Add Vercel env vars for preview and production:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Re-run preview build and inspect next failure, if any.

### Loop 2 - Typecheck gate

Prioritize these first:

1. Shared UI dependency/export cleanup:
   - `react-day-picker`
   - `@radix-ui/react-label`
   - `buttonVariants`
   - `CardDescription`
   - `CardAction`
2. Dashboard nav icon typing.
3. Purchasing page type mismatches.
4. POS orders page type mismatch.
5. Arkiv desktop discriminated union cleanup.

### Loop 3 - Lint gate

Do not start by fixing all 521 lint errors manually.
Recommended approach:

1. Decide whether `scripts/*.js` should be excluded from TypeScript ESLint rules or converted to ESM.
2. Add targeted types for API response rows to reduce `no-explicit-any`.
3. Fix React Compiler lint errors before cosmetic unused-variable cleanup.

### Loop 4 - Runtime QA

Needs `.env.local` or Vercel env access.

Priority flows:
- Login to Arkiv OS.
- POS cashier paid order.
- POS open bill.
- POS Profit Report with CSV export.
- Production complete finished good.
- HPP sync to POS product cost.
- Purchasing GRN receive to inventory movement.

## Open Questions

1. Should preview deployments be allowed to build without Supabase env, or should missing env fail loudly?
2. Should `src/app/dashboard/pos-ui-backup` remain in the typecheck target, or can it be archived/excluded?
3. Should `scripts/*.js` be linted under the same strict TypeScript ESLint rules as app source?

## Current Conclusion

The immediate Vercel prerender crash was addressed with build-safe Supabase helpers.
Core tests pass.
The repo is not yet ready for strict `npm run lint` or `npx tsc --noEmit` as global gates because historical type/lint debt spans multiple modules.

The next best engineering loop is deployment validation on Vercel, followed by a shared UI/type dependency cleanup pass.
