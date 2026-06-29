# Database Migrations — Arkiv OS

## Overview

| Type | Location | Runner |
| --- | --- | --- |
| **Baseline + incremental** | `database/migrations/` | `npm run db:migrate` / `db:migrate:apply` |
| **Legacy archive** | `sql/archive/` | Manual / referensi historis saja |

Stack: **PostgreSQL native** + plain SQL + Node runner (`database/scripts/apply-migrations.js`).

---

## Quick start

```bash
# .env.local — target lokal untuk apply
MIGRATE_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/arkiv

# .env — sumber introspeksi (opsional, fallback DATABASE_URL)
SOURCE_DATABASE_URL=postgresql://...

# Preview pending migrations
npm run db:migrate

# Apply pending
npm run db:migrate:apply

# Regenerate baseline dari DB sumber
npm run db:pull
```

---

## Apply order

Urutan ditentukan prefix numerik pada **nama file** (bukan folder):

1. `app_auth` — schema `auth`
2. `prelude` — extensions + enums
3. `schemas/**/table_*` — DDL per tabel
4. `functions` → `foreign_keys` → `views` → `triggers`
5. `strip_legacy_rls` — defensive disable RLS (legacy DB)
6. `YYYYMMDD...` — migrasi incremental

Tracking: tabel `schema_migrations` (basename file).

---

## Safety

- Dry-run by default — pass `--apply` to execute
- One transaction per migration file
- Apply/seed **hanya** ke Postgres lokal (`localhost` / `127.0.0.1`)

---

## Related

- Detail pipeline: `database/README.md`
- Runner notes: `docs/MIGRATION_RUNNER.md`
- Urutan arsip legacy: `docs/MIGRATION_ORDER.md` (historis)
