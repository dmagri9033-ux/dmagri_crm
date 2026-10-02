# DM Agree CRM — Deployment Plan (Vercel + Supabase)

**Status:** Planning only  
**Last updated:** 2026-10-02

---

## 1. Environments

| Environment | Supabase project | Vercel | Purpose |
|-------------|------------------|--------|---------|
| **Local** | Local CLI or dev project | `next dev` | Development |
| **Preview** | Staging project (recommended) | PR previews | QA |
| **Production** | Prod project | Production domain | Live CRM |

Use **separate** Supabase projects for prod vs dev to prevent data leaks.

---

## 2. Supabase project setup

### 2.1 Database

1. Create project in Supabase dashboard.
2. Enable `pg_trgm` extension for name search (if used).
3. Apply migrations from `supabase/migrations/`.
4. Run seed for permissions and system roles (not prod passwords).

### 2.2 Authentication

- Enable Email provider.
- Disable public sign-up (invite/admin create only).
- Configure **Site URL** and **Redirect URLs**:
  - `http://localhost:3000/auth/callback`
  - `https://<production-domain>/auth/callback`
  - Preview URLs pattern for Vercel previews (or disable password reset on previews).
- Email templates: customize password reset branding (optional).

### 2.3 Storage

- Create private bucket `crm-attachments`.
- Policies: authenticated users with app-level path conventions `{entity_type}/{entity_id}/{file}`.
- Max file size enforced in Server Action (e.g. 10 MB default — confirm).

### 2.4 Realtime (optional)

- Subscribe to `notifications` for bell updates — Phase 11.

---

## 3. Vercel setup

### 3.1 Project

- Import Git repository (after Phase 1 init).
- Framework preset: Next.js.
- Root directory: `.` (or `src` if used).
- Node version: LTS (20+).

### 3.2 Environment variables

**Production + Preview:**

| Variable | Notes |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Production only**; mark sensitive |
| `CRON_SECRET` | Random string; Vercel Cron auth |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL |

**Never** expose `SUPABASE_SERVICE_ROLE_KEY` to client bundles — no `NEXT_PUBLIC_` prefix.

### 3.3 Vercel Cron

`vercel.json` example (plan):

```json
{
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

- Hourly run recommended for overdue/today notification fan-out (adjust after load testing).
- Route Handler validates header `Authorization: Bearer ${CRON_SECRET}`.
- Cron uses admin client or SECURITY DEFINER SQL; logs outcomes.

**Timezone:** Cron runs UTC; handler converts to **Asia/Kolkata** for “today” and date keys in `dedupe_key`.

### 3.4 Domains

- Assign company domain or subdomain (`crm.company.com`).
- Update Supabase redirect URLs to match.

---

## 4. Migrations in production

**Recommended flow:**

1. Merge migration SQL to main branch.
2. CI or manual: `supabase db push` against prod (or Supabase GitHub integration).
3. Deploy Vercel after migrations succeed.

**Rollback:** Forward-only migrations; write compensating migrations instead of down scripts unless emergency.

---

## 5. CI/CD (planned)

| Step | Tool |
|------|------|
| Lint / typecheck | `pnpm lint`, `tsc --noEmit` |
| Unit/integration tests | Vitest or Jest |
| Preview deploy | Vercel on PR |
| Prod deploy | Merge to main |

---

## 6. Observability

| Concern | Approach |
|---------|----------|
| Errors | Vercel logs + optional Sentry (decision required) |
| Auth failures | Supabase Auth logs |
| Cron failures | Log + alert on repeated 401/500 |
| DB performance | Supabase query performance page |

No persistent file storage on Vercel for uploads.

---

## 7. Security checklist (deploy)

- [ ] Sign-up disabled in Supabase
- [ ] RLS enabled on all public tables
- [ ] Service role only in server env
- [ ] CRON_SECRET set and verified
- [ ] HTTPS only
- [ ] Cookie settings per `@supabase/ssr` defaults (HttpOnly, Secure in prod)
- [ ] CORS defaults for Supabase (no custom wide-open API)

---

## 8. Local development

```bash
# Planned commands (Phase 1)
pnpm install
cp .env.example .env.local
pnpm dev
```

`.env.example` documents all variables without secrets.

Supabase local optional via Docker CLI; otherwise point `.env.local` at dev project.

---

## 9. Bootstrap first admin (production)

**Do not commit credentials.**

1. Create user in Supabase Auth dashboard OR run one-time server script with service role.
2. Insert `profiles` row with Administrator `role_id`.
3. Verify login and permission count.

Document in README “First-time setup” section.

---

## 10. Related documents

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — Phases 2, 11, 17
