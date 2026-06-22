# EPIC-000: Project Bootstrap — Arkiv OS

status: done
environment: dev
phase: 0
priority: P0
area: Infra

## Goal

Establish the agentic workflow baseline for Arkiv OS so Claude Code and Codex
automation can run reliably across sessions.

## Stack

- **Framework**: Next.js 16.2.3 (Turbopack, App Router)
- **Database**: Supabase (Postgres + RPC + RLS)
- **Auth**: Supabase Auth + `@supabase/ssr`
- **Styling**: Tailwind CSS
- **Tests**: Vitest
- **Lint**: ESLint

## Dev Commands

```bash
npm run dev       # start dev server → http://localhost:3000
npm run build     # production build
npm run lint      # ESLint
npm run test      # Vitest (run once)
npm run test:watch
```

## Evidence — Existing Docs

| File | Purpose |
| --- | --- |
| `docs/AGENTIC-WORKFLOW.md` | Runbook: status vocab, handoff checklists |
| `docs/pos/` | POS module docs & dev plans |
| `docs/crm/`, `docs/hris/`, etc. | Per-module documentation |
| `docs/360-feedback-system.md` | HR feature doc |
| `docs/PenyemuranaanV1.md` | Improvement notes v1 |
| `AGENTS.md` | Codex agent rules (Next.js warning + hygiene) |
| `CLAUDE.md` | Claude Code rules (refs AGENTS.md) |

## Known Deprecations (as of 2026-06-22)

- `middleware` file convention deprecated → rename to `proxy`
  (ref: Next.js 16 warning on dev server startup)
- `module.register()` → `module.registerHooks()` (Node.js DEP0205, non-blocking)

## Task Groups

### 1. Bootstrap docs/epics structure ✅
- [x] Create `docs/epics/` directory
- [x] Add `docs/epics/README.md` with status vocab and entry points
- [x] Create this bootstrap epic

### 2. Fix middleware → proxy deprecation
- [ ] Locate `middleware.ts` / `middleware.js` in project root
- [ ] Rename to `proxy.ts` / `proxy.js` per Next.js 16 convention
- [ ] Verify dev server starts without the deprecation warning

### 3. Triage flat docs in `docs/`
- [ ] Identify which flat `.md` files are still relevant
- [ ] Archive or promote to epics as appropriate

## Acceptance Criteria

- `docs/epics/` exists with README and this bootstrap file
- Status vocabulary matches the global workflow (`backlog` / `on-progress` / `coding` / etc.)
- `docs/AGENTIC-WORKFLOW.md` entry points are accurate

## Automation Log

| Date | Agent | Action | Result |
| --- | --- | --- | --- |
| 2026-06-22 | Claude Code | Create `docs/epics/` structure, bootstrap epic | done |
