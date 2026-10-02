# Manual QA checklist (Phase 16)

Run against a seeded local or staging environment after `npm run build` / `npm run dev`.

## Auth & RBAC

- [ ] Login with valid admin credentials → dashboard.
- [ ] Login with wrong password → error; after ~10 failures → rate-limit message.
- [ ] Inactive profile → signed out / cannot use app.
- [ ] Role without `customer.view` → Customers nav hidden; direct `/customers` shows forbidden.
- [ ] Direct server action without permission → forbidden error (e.g. create customer as auditor).
- [ ] Last administrator demote/delete role → blocked.

## Customers & 360

- [ ] Create customer; duplicate mobile → warning with update/skip (no silent duplicate).
- [ ] Customer with many follow-ups → 360 follow-up list ordered, “Latest” on first.
- [ ] Multiple inquiries + purchases → 360 sections populated.
- [ ] Soft-deleted customer not listed; history preserved for linked inquiries.

## Inquiries / Excel

- [ ] Inactive product hidden from new inquiry; existing inquiry still shows product.
- [ ] Download template → fill row → import → preview shows valid/invalid by row.
- [ ] Import with duplicate mobile → marked duplicate; skip vs update works.
- [ ] Export with filters → file matches filtered set.
- [ ] Non-.xlsx / renamed text file → rejected.

## Reminders & notifications

- [ ] Reminder overdue/today/upcoming badges match IST day.
- [ ] Complete / snooze / reopen update status as expected.
- [ ] Cron with Bearer `CRON_SECRET` creates today/overdue notifications.
- [ ] Second cron run does not duplicate (same dedupe_key).

## Activity & dashboard

- [ ] `/activity` visible only with `activity.view`.
- [ ] 360 activity timeline shows create/update for a test customer.
- [ ] Dashboard cards/charts reflect DB counts (not hardcoded).

## Non-functional

- [ ] Mobile viewport: lists + 360 usable.
- [ ] Slow queries show loading UI where implemented.

## Automated coverage (CI)

```bash
npm run test:run
npm run lint
npm run build
```

Exceptions (not automated in Phase 16 unit suite — require live Supabase / E2E):

| Scenario | Status |
|----------|--------|
| 1–3, 5–6, 8–10, 12–14 (full UI flows) | Manual checklist above |
| Server action + JWT integration | Deferred to local Supabase Vitest project |
| Playwright E2E | Optional; not shipped in Phase 16 |
