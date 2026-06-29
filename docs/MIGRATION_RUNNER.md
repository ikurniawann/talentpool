# Migration Runner

Runner utama: `database/scripts/apply-migrations.js`

## Commands

```bash
npm run db:migrate          # dry-run (list pending)
npm run db:migrate:apply    # apply pending to MIGRATE_DATABASE_URL
npm run db:pull             # regenerate baseline from SOURCE_DATABASE_URL / DATABASE_URL
```

Requires `MIGRATE_DATABASE_URL` (local) in `.env.local` for apply. Preview/read uses the same URL.

## Behaviour

- Discovers all `*.sql` under `database/migrations/` recursively
- Sorts by 14-digit filename prefix
- Records applied files in `schema_migrations`
- Sets `search_path` per `database/schema-map.js` before each session

## IAM modular migrations (legacy)

Older modular IAM migrations under `scripts/iam/` may still exist for reference. New work goes in
`database/migrations/` as incremental SQL files.
