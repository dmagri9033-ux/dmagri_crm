# Supabase setup (Phase 2)

## 1. Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- URL must **not** include `/rest/v1/`.
- Anon / publishable key → browser + server user client.
- Service role / secret key → **server only** (`src/lib/supabase/admin.ts`).

## 2. Apply schema

Run in Supabase SQL Editor (in order):

1. `supabase/migrations/20261002120000_initial_schema.sql`
2. `supabase/seed.sql`

Or via CLI after `supabase link`:

```bash
npm run db:push
npx supabase db query --linked -f supabase/seed.sql
```

## 3. Auth settings (prep for Phase 3)

- Disable public sign-up
- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`

## 4. Verify

```bash
npm run dev
# open http://localhost:3000/api/health/supabase
```

Expect:

```json
{ "ok": true, "configured": true, "permissionsCount": 36, "seeded": true }
```

## 5. Bootstrap first admin (required to sign in)

1. Supabase Dashboard → **Authentication → Users → Add user** (email + password).
2. Copy the user UUID.
3. Ensure seed has been run (`Administrator` role id `11111111-1111-1111-1111-111111111111`).
4. Run in SQL Editor:

```sql
INSERT INTO public.profiles (id, display_name, email, role_id, is_active)
VALUES (
  '<auth-user-uuid>',
  'Admin',
  'admin@example.com',
  '11111111-1111-1111-1111-111111111111',
  true
);
```

5. Sign in at `/login`.

Do **not** store passwords in `profiles`.

## 6. Auth redirect URLs

In Supabase Auth URL configuration:

- Site URL: `http://localhost:3000`
- Redirect URLs: `http://localhost:3000/auth/callback`
