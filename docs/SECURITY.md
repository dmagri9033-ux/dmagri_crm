# Security

DM Agree CRM security model for Phase 15+. Application RBAC remains primary; Postgres RLS is a second line of defense against direct PostgREST misuse of the anon key + user JWT.

## Trust boundaries

| Layer | Responsibility |
|-------|----------------|
| Next.js Server Actions / route handlers | `authorize(permission)` on every mutation and sensitive read |
| Supabase Auth cookies | Session identity; refreshed in middleware |
| RLS (`is_active_profile`, `app_has_permission`) | Blocks inactive users; hardens roles, notifications, imports, activity logs |
| Service role | Server-only — cron notification fan-out and rare admin ops. Never `NEXT_PUBLIC_*` |

## Authentication & CSRF

- Login / password flows use Server Actions (Next.js action origin checks).
- Mutations are Server Actions; avoid ad-hoc cookie-authenticated state-changing `POST` route handlers without tokens.
- Cron route authenticates with `Authorization: Bearer $CRON_SECRET` only in production (query `?secret=` allowed in development for manual testing).
- Middleware allows `/api/cron/*` without a user session so Vercel Cron can reach the handler.

## Rate limiting (D7)

In-process limits (per Node instance):

| Endpoint | Limit |
|----------|--------|
| Login action | 10 attempts / 15 minutes / IP |
| Excel import upload | 10 uploads / 15 minutes / IP |

For multi-instance Vercel production, replace with [Upstash Ratelimit](https://upstash.com/docs/redis/sdks/ratelimit-ts/overview) using the same keys.

## Upload validation

Excel import accepts **`.xlsx` only**, max **5 MB**, max **1000** data rows, ZIP/OOXML magic-byte check, then ExcelJS parse. Rejected: empty files, wrong extension/MIME, non-zip payloads.

## RLS highlights (Phase 15 migration)

- `app_has_permission(code)` — SECURITY DEFINER helper joining profile → role_permissions → permissions.
- **roles / role_permissions** writes require `role.create` / `role.update` / `role.delete`.
- **notifications** insert: `user_id = auth.uid()` (cron uses service role).
- **activity_logs** select: `activity.view` (global) **or** `customer.view` with non-null `customer_id` (360).
- **import_batches / rows**: owner-scoped to `created_by = auth.uid()`.
- **profiles** insert: requires `user.create`.

Business tables (customers, inquiries, …) remain “active profile” RLS; fine-grained `*.create` etc. stay in the app until needed.

## Dependency audit

```bash
npm run audit
```

Fails on **high**+ findings (`--audit-level=high`). As of Phase 15, `npm audit` reports **moderate** `uuid` via `exceljs` (no non-breaking fix without downgrading ExcelJS). Accepted for now — re-check before prod or pin when ExcelJS upgrades uuid.

Review and remediate `high`+ findings before production. Document accepted risk in release notes if you must ship with exceptions.

## Manual pen-test checklist

With the **anon key** (no session): PostgREST SELECT/INSERT on business tables must fail or return empty (RLS).

With a **low-privilege** logged-in user (e.g. Sales Executive JWT):

1. Cannot INSERT into `roles` / `role_permissions` via PostgREST.
2. Cannot INSERT `notifications` for another `user_id`.
3. Cannot SELECT another user’s `import_batches`.
4. Cannot SELECT global `activity_logs` without `activity.view` (customer-scoped rows with `customer.view` only).
5. Excel upload of a renamed `.txt` / non-zip file is rejected.
6. Repeated login failures return rate-limit error after threshold.

## Deploy reminders

See `docs/DEPLOYMENT_PLAN.md` §7: disable public sign-up, set `CRON_SECRET`, never expose service role to the browser, verify HTTPS and Auth redirect URLs.
