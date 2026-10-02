# DM Agree CRM — Role-Based Access Control (RBAC)

/** Status:** Phase 4 implemented in application code  
**Last updated:** 2026-10-02

---

## 1. Overview

RBAC is **custom** and stored in PostgreSQL. Supabase Auth provides identity only. Authorization is enforced on **every** Server Action, Route Handler, and sensitive Server Component data load.

**UI hiding is not security.**

---

## 2. Core entities

| Entity | Table | Purpose |
|--------|-------|---------|
| Permission | `permissions` | Atomic capability identified by stable `code` |
| Role | `roles` | Named collection of permissions |
| RolePermission | `role_permissions` | M:N join |
| User | `profiles` | Links `auth.users.id` to `role_id` |

---

## 3. Permission catalog

Convention: `{module}.{action}`

### Dashboard

| Code | Description |
|------|-------------|
| `dashboard.view` | View dashboard and widgets |

### Inquiries

| Code | Description |
|------|-------------|
| `inquiry.view` | List and view inquiries |
| `inquiry.create` | Create inquiries |
| `inquiry.update` | Edit inquiries |
| `inquiry.delete` | Delete inquiries (soft) |
| `inquiry.import` | Excel import |
| `inquiry.export` | Excel export |

### Customers

| Code | Description |
|------|-------------|
| `customer.view` | List and view customers |
| `customer.create` | Create customers |
| `customer.update` | Edit customers |
| `customer.delete` | Delete customers |
| `customer.import` | Excel import |
| `customer.export` | Excel export |

### Products

| Code | Description |
|------|-------------|
| `product.view` | List products |
| `product.create` | Create products |
| `product.update` | Edit / activate / deactivate |
| `product.delete` | Delete with safeguards |

### Reminders

| Code | Description |
|------|-------------|
| `reminder.view` | List reminders |
| `reminder.create` | Create reminders |
| `reminder.update` | Edit, snooze, reopen |
| `reminder.delete` | Delete reminders |
| `reminder.complete` | Mark complete |

### Follow-ups

| Code | Description |
|------|-------------|
| `followup.view` | List and view follow-ups |
| `followup.create` | Add follow-ups |
| `followup.update` | Edit follow-ups |
| `followup.delete` | Delete follow-ups |

### Roles

| Code | Description |
|------|-------------|
| `role.view` | List roles |
| `role.create` | Create roles |
| `role.update` | Edit role permissions |
| `role.delete` | Delete roles |

### Users

| Code | Description |
|------|-------------|
| `user.view` | List users |
| `user.create` | Create users (Auth + profile) |
| `user.update` | Edit users, activate/deactivate |
| `user.delete` | Delete/deactivate users |
| `user.reset_password` | Trigger password reset for another user |

### Activity

| Code | Description |
|------|-------------|
| `activity.view` | View global activity log (admin/audit) |

**Note:** Customer 360° is covered by `customer.view` plus module permissions for actions (e.g. add follow-up requires `followup.create`).

---

## 4. Default roles (seed)

| Role | is_system | Typical permissions |
|------|-----------|---------------------|
| **Administrator** | true | All permissions |
| **Sales Executive** | false | dashboard, inquiry.*, customer.*, followup.*, reminder.*, product.view |
| **Read-only Auditor** | false | *.view, activity.view |

Exact defaults are configurable at seed time; Administrator must retain `role.*` and `user.*` for bootstrap.

---

## 5. Server enforcement architecture

```typescript
// Pseudocode — lib/rbac/authorize.ts
async function getSessionContext(): Promise<{
  userId: string;
  profile: Profile;
  permissions: Set<PermissionCode>;
}>;

async function authorize(required: PermissionCode | PermissionCode[]): Promise<SessionContext>;

async function authorizeAny(codes: PermissionCode[]): Promise<SessionContext>;
```

**Flow for every Server Action:**

1. `const ctx = await authorize('inquiry.create')`
2. Validate input with Zod
3. Execute repository method
4. Write `activity_logs`
5. Revalidate paths / return result

**On failure:** throw `ForbiddenError` / return `{ error: 'FORBIDDEN' }` — never leak whether record exists.

---

## 6. UI enforcement architecture

1. Server layout loads permissions once: `getPermissionsForUser(userId)`.
2. Pass to client via React context or serialize into layout props.
3. Components:
   - `<Can permission="inquiry.create">...</Can>`
   - Disable buttons with tooltip “No permission” when false.
4. Nav items: hide modules where user lacks `{module}.view`.

**Mismatch handling:** If user bookmarks a forbidden route, server layout returns 403 page.

---

## 7. Special protection rules

| Rule | Implementation |
|------|----------------|
| Last administrator | Before role change/delete/deactivate: count admins with `user.update`; block if ≤ 1 |
| System roles | `roles.is_system = true` → no delete; limited rename |
| Roles in use | Block delete if any `profiles.role_id` references role; offer reassign |
| Self-demotion | User cannot remove own `user.update` / admin role without another admin |
| Inactive user | `profiles.is_active = false` → middleware logout; all actions reject |

---

## 8. User creation and passwords

| Step | Actor | Mechanism |
|------|-------|-----------|
| Create Auth user | Server Action + **admin client** | `auth.admin.createUser({ email, password, email_confirm: true })` |
| Create profile | Same transaction flow | Insert `profiles` with returned `user.id` |
| Edit user | Server | Update profile; sync email via admin API if changed |
| Reset password | Server | `auth.resetPasswordForEmail` or admin set temporary password (policy TBD) |
| Deactivate | Server | Set `is_active = false`; optional `auth.admin.updateUserById({ ban_duration })` |

Password field in UI exists only on create/reset forms; **never** persisted in `profiles`.

---

## 9. RLS alignment (defense in depth)

Phase 4+: Enable RLS requiring active profile.

Optional Phase 15: PostgreSQL function:

```sql
-- Conceptual
CREATE FUNCTION app_has_permission(p_code text) RETURNS boolean ...
```

Policies:

- SELECT on `customers` → `app_has_permission('customer.view')`
- INSERT on `inquiries` → `app_has_permission('inquiry.create')`

JWT custom claims are limited in size; prefer DB lookup in RLS via `profiles` + joins (cached per request in Postgres).

---

## 10. Testing requirements (RBAC)

1. User without `customer.view` → 403 on `/customers` and on `createCustomer` action.
2. Direct POST to Server Action without session → unauthorized.
3. User with view but not delete → delete action fails.
4. Last admin demotion blocked.
5. Inactive user cannot complete login flow meaningfully.
6. Role permission change takes effect on next request (no stale client cache beyond session TTL).

---

## 11. Related documents

- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md) — `permissions`, `roles`, `role_permissions`, `profiles`
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Auth + server client patterns
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — Phase 4 delivery
