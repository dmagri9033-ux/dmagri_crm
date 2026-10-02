# DM Agree CRM

Internal CRM for inquiries, customers, products, reminders, follow-ups, roles, users, and Customer 360° views.

**Current status:** Phase 16 testing complete. Production deployment is next.

## Tech stack

- Next.js (App Router) + TypeScript + React
- Tailwind CSS + shadcn/ui + Lucide React
- Supabase (PostgreSQL, Auth, Storage)
- Zod · ExcelJS · Recharts · planned: Vercel

## Prerequisites

- Node.js 20+ (Node 24 works)
- npm (project uses `package-lock.json`)
- A Supabase project (or Docker for local Supabase CLI)

## Local setup

```bash
npm install
cp .env.example .env.local
# Fill Supabase URL + anon key + service role key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/dashboard`.

## Supabase database setup

1. Create a project in the [Supabase dashboard](https://supabase.com/dashboard).
2. Set env vars (`.env` or `.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<project-ref>.supabase.co` (**no** `/rest/v1/`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon / publishable key
   - `SUPABASE_SERVICE_ROLE_KEY` = service_role / secret key (server only)
3. Apply schema + seed (pick one):

**Option A — SQL Editor (simplest)**

1. Open Supabase → SQL Editor.
2. Paste and run migrations in order:
   - `supabase/migrations/20261002120000_initial_schema.sql`
   - `supabase/migrations/20261002140000_phase15_rls_hardening.sql`
3. Paste and run `supabase/seed.sql`.

**Option B — CLI**

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
# then run seed.sql in SQL Editor, or:
npx supabase db query --linked -f supabase/seed.sql
```

4. Verify: with `npm run dev`, open `/api/health/supabase` — expect `"ok": true` and `"seeded": true`.

Auth: disable public sign-up in Supabase Auth settings (admin-created users only). Site URL: `http://localhost:3000`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run test` | Vitest (watch) |
| `npm run test:run` | Vitest single run (CI) |
| `npm run audit` | Dependency audit (high+) |
| `npm run db:push` | Push migrations to linked remote |
| `npm run db:reset` | Reset local Supabase DB + seed |
| `npm run db:types` | Regenerate types from local DB |

## Environment variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Project URL (`https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anon / publishable key |
| `NEXT_PUBLIC_APP_URL` | Public | App base URL for redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin operations (never expose to browser) |
| `CRON_SECRET` | Server only | Authenticate Vercel Cron jobs |

Manual reminder notification cron (local):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

## Project structure

```
src/
  app/                 # App Router routes
  components/          # UI + layout
  lib/supabase/        # Browser, server, admin clients
  types/               # Database types
supabase/
  migrations/          # SQL migrations
  seed.sql             # Permissions + default roles
docs/                  # Architecture & implementation plan
```

## Planning documents

See `docs/IMPLEMENTATION_PLAN.md`, `docs/SECURITY.md`, and related design docs.

## Next step

`EXECUTE PHASE 17` — Production deployment

