# Database Migrations (PostgreSQL native)

Pipeline migrasi untuk menjalankan aplikasi di **PostgreSQL native** (driver `pg`, tanpa vendor lock-in).

Baseline schema diambil lewat introspeksi `pg_catalog` dari database sumber (`SOURCE_DATABASE_URL`),
bukan dari arsip SQL lama. Runner utama membaca `database/migrations/`.

## Struktur

Baseline dipecah **satu file per tabel**. FK, function, view, dan trigger dipisah ke file tersendiri
supaya setiap file tabel valid mandiri tanpa bergantung urutan tabel lain.

File tabel **diorganisir per schema/domain** ke dalam `schemas/<domain>/` dan tabel dibuat di
**schema PostgreSQL asli** (mis. `hris.employees`, `crm.crm_rewards`). Enum/function/view tetap di
`public`. Pemetaan tabel → domain → schema ada di `database/schema-map.js`.

```
database/
├── schema-map.js
├── migrations/
│   ├── 00000000000000_app_auth.sql            # manual — schema auth (HARUS pertama)
│   ├── 00000000000001_prelude.sql             # generated — extensions + enum types
│   ├── schemas/<domain>/..._table_*.sql      # generated — satu file per tabel
│   ├── 00000000001000_functions.sql
│   ├── 00000000002000_foreign_keys.sql
│   ├── 00000000003000_views.sql
│   ├── 00000000004000_triggers.sql
│   ├── 00000000010000_strip_legacy_rls.sql      # manual — defensive disable RLS (legacy)
│   └── YYYYMMDD..._*.sql                      # migrasi incremental
└── scripts/
    ├── generate-from-db.js
    ├── apply-migrations.js
    └── migrate-data.js
```

Urutan apply ditentukan **prefix 14-digit pada NAMA FILE** (bukan path). Tracking di
`schema_migrations` memakai **basename** (unik global).

## Variabel env

| Variabel               | File         | Dipakai oleh    | Isi                                      |
| ---------------------- | ------------ | --------------- | ---------------------------------------- |
| `SOURCE_DATABASE_URL`  | `.env`       | `db:pull`       | DB sumber untuk introspeksi (opsional)   |
| `DATABASE_URL`         | `.env`       | app, `db:pull`  | Koneksi Postgres utama                   |
| `MIGRATE_DATABASE_URL` | `.env.local` | `db:migrate*`   | Postgres lokal untuk apply migrasi       |

> `db:migrate:apply` dan seeder **menolak** target non-lokal (bukan localhost).

## Menjalankan lokal

```bash
# 1. Buat database: CREATE DATABASE arkiv;

# 2. Generate baseline dari DB sumber (sekali, atau saat schema berubah)
npm run db:pull

# 3. Preview migrasi pending
npm run db:migrate

# 4. Terapkan ke Postgres lokal
npm run db:migrate:apply

# 5. (opsional) Seed super admin
npm run db:seed:super-admin
```

`generate-from-db.js` introspeksi schema `public` + `iam`, lalu menulis file per-tabel +
functions/fk/views/triggers. Setiap pull **menghapus & menulis ulang** file generated. File manual
(`app_auth`, `strip_legacy_rls`) tidak disentuh.

### Migrasi incremental

Tambahkan file baru dengan prefix lebih besar, contoh:

```
database/migrations/20260625120000_add_some_table.sql
```

Lalu `npm run db:migrate:apply`. File yang sudah diterapkan dilewati otomatis.

## Catatan

- `00000000000000_app_auth.sql` — schema `auth` + `auth.users` + `auth.sessions` untuk login aplikasi.
- Generator hanya membaca objek user di `public` + `iam`; artefak RLS/policy vendor lama diabaikan.
- `search_path` global di-set oleh runner dan `src/lib/db.ts` agar referensi tabel bare tetap resolve.
