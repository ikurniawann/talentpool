# Talent Pool & Recruitment System

Sistem Rekrutmen & Talent Pool untuk Aapex Technology.

## Tech Stack

- **Framework**: Next.js 14+ (App Router, fullstack)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS + shadcn/ui
- **WhatsApp**: Fonnte API
- **Email**: Resend
- **Deployment**: Vercel

## Getting Started

### 1. Install Dependencies

```bash
npm install
npm install resend
```

### 2. Setup Environment

```bash
cp .env.local.example .env.local
# Fill in your API keys
```

### 3. Supabase Setup

1. Buat project di [supabase.com](https://supabase.com)
2. Jalankan migration SQL di `supabase/migrations/001_initial_schema.sql`
3. Copy credentials ke `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/           # Login page
│   ├── (public)/portal/        # Public candidate application portal
│   ├── (dashboard)/dashboard/  # Protected dashboard
│   │   ├── candidates/          # Candidate management
│   │   ├── pipeline/            # Kanban pipeline
│   │   ├── talent-pool/        # Talent pool
│   │   ├── analytics/          # Analytics & reporting
│   │   └── settings/            # Brand & position settings
│   └── api/                    # REST API endpoints
│       ├── candidates/          # CRUD kandidat
│       ├── positions/           # CRUD posisi
│       ├── brands/              # CRUD outlet
│       ├── interviews/          # CRUD interview
│       └── notifications/send/ # Kirim WA/Email
├── components/
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── supabase/               # Supabase clients (browser/server/middleware)
│   ├── fonnte/                 # Fonnte WhatsApp integration
│   ├── resend/                 # Resend email integration
│   └── utils/                  # Utility functions
└── types/
    └── index.ts                # TypeScript types
```

## User Roles

| Role | Akses |
|------|-------|
| HRD | Full access: input kandidat, pipeline, talent pool, settings, notification |
| Hiring Manager | Lihat & update kandidat divisinya, input interview scorecard |
| Direksi | Read-only: analytics dashboard |

## API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/candidates` | List kandidat (filter: status, brand_id, search) |
| POST | `/api/candidates` | Tambah kandidat baru |
| GET | `/api/candidates/[id]` | Detail kandidat |
| PUT | `/api/candidates/[id]` | Update kandidat |
| DELETE | `/api/candidates/[id]` | Hapus kandidat |
| GET | `/api/positions` | List posisi |
| POST | `/api/positions` | Tambah posisi |
| GET | `/api/brands` | List outlet/brand |
| POST | `/api/brands` | Tambah outlet |
| GET | `/api/interviews` | List interview |
| POST | `/api/interviews` | Buat interview (auto update status kandidat) |
| POST | `/api/notifications/send` | Kirim WhatsApp / Email ke kandidat |

## Database Schema

- `brands` — Outlet / subsidiary
- `positions` — Job titles per brand
- `users` — User profiles (extends auth.users)
- `candidates` — Candidate data
- `interviews` — Interview records with scorecard (JSONB)
- `notifications_log` — Notification history

## Future Integrations

- [ ] API integration ke Talenta by Mekari (Absensi & Payroll)
- [ ] CV upload via Supabase Storage
- [ ] WhatsApp notification with Fonnte (API key needed)
- [ ] Email notification with Resend (API key needed)
