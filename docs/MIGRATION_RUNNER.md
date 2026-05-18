# 🗄️ Arkiv OS — Automated Database Migration Runner

## Quick Start

### 1. Get your database connection string
1. Open [Supabase Dashboard](https://app.supabase.io)
2. Go to your project → **Database** → **Connection Pooling**
3. Copy **Session mode** connection string (port `6543`)
4. Add to your `.env.local`:
```
DATABASE_URL=postgresql://postgres.********:********@aws-0-******.pooler.supabase.com:6543/postgres
```

### 2. Dry-run (preview which migrations will run)
```bash
cd ~/Desktop/talentpool
node scripts/apply-migrations.js
```

### 3. Apply migrations
```bash
node scripts/apply-migrations.js --apply
```

## Safety Features
- ✅ **Dry-run by default** — must pass `--apply` to actually execute
- ✅ **Transaction per migration** — if one fails, it rolls back
- ✅ **Danger-guard** — skips `TRUNCATE` / `DELETE` unless `--force` is passed
- ✅ **Idempotent tracking** — only runs migrations not yet in `schema_migrations` table

## What I applied just now
| File | Status |
|------|--------|
| `20260518_000001_ai_assistant_memory.sql` | ✅ AI Assistant sessions & messages table |

> **Note:** If you don't want to set up `DATABASE_URL`, you can still apply migrations manually by copy-pasting each `.sql` file into Supabase Dashboard → SQL Editor.
