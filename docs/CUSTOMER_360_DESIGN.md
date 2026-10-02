# DM Agree CRM — Customer 360° Design

**Status:** Phase 7 implemented  
**Route:** `/customers/[customerId]`  
**Last updated:** 2026-10-02

---

## 1. Purpose

Customer 360° is the **single pane of glass** for relationship history: profile, inquiries, purchases, follow-ups, reminders, notes, and activity timeline. It is linked from Customers, Inquiries, Follow-ups, Reminders, and Dashboard widgets.

---

## 2. Page layout (wireframe)

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Name | Mobile | Type | Purchased | Follow-up req    │
│ Assigned: [User]     [Add Inquiry] [Follow-up] [Reminder] ... │
├─────────────────────────────────────────────────────────────┤
│ Tabs or stacked sections:                                   │
│  [Profile] [Inquiries] [Purchases] [Follow-ups] [Reminders] │
│  [Notes] [Activity]                                         │
└─────────────────────────────────────────────────────────────┘
```

**Quick actions:**

| Action | Permission | Behavior |
|--------|------------|----------|
| Add inquiry | `inquiry.create` | Modal/sheet with customer prefilled |
| Add follow-up | `followup.create` | Modal; optional inquiry link |
| Add reminder | `reminder.create` | Modal; default assignee = current user or customer owner |
| Edit customer | `customer.update` | Navigate or drawer |
| Call customer | `customer.view` | `tel:` link |
| Copy mobile | `customer.view` | Clipboard API + toast |

---

## 3. Data loading strategy (performance)

**Goal:** Avoid N+1 and dozens of round trips.

### Option A (recommended): Single server orchestrator

`getCustomer360(customerId)` in `lib/db/customer-360.ts`:

```typescript
// Parallel bounded queries (6–8), not one query per row
const [profile, inquiries, purchases, followups, reminders, notes, activity] =
  await Promise.all([
    getCustomerById(id),
    getInquiriesByCustomer(id, { limit: 50, order: 'desc' }),
    getPurchasesByCustomer(id),
    getFollowupsByCustomer(id, { limit: 100 }),
    getRemindersByCustomer(id, { includeCompleted: true, limit: 50 }),
    getNotesByCustomer(id, { limit: 50 }),
    getActivityByCustomer(id, { limit: 100 }),
  ]);
```

### Option B: Supabase RPC

One PostgreSQL function `get_customer_360(p_customer_id uuid)` returning JSONB sections — optimize later if profiling shows need.

**Pagination within sections:** “Load more” for follow-ups/activity if count exceeds threshold.

**Authorization:** Page loader calls `authorize('customer.view')`; section actions re-check granular permissions.

---

## 4. Section specifications

### 4.1 Customer profile

**Source:** `customers` + joins (`products` for primary product, `profiles` for assigned user).

| Field | Source |
|-------|--------|
| Name, mobile, type | `customers` |
| Products (summary) | Primary product + distinct from purchases/inquiries |
| Purchase status | `customers.product_purchased` + purchase table |
| Follow-up required | `customers.follow_up_required` |
| Notes | `customers.notes` + recent `customer_notes` |
| Created / updated | `customers.created_at`, `updated_at` |

---

### 4.2 Inquiry history

**Source:** `inquiries` JOIN `products`, `profiles` (created_by).

| Column | Notes |
|--------|-------|
| Date | `inquiry_date` |
| Product | product name (join; snapshot if implemented) |
| Customer type | inquiry row or customer |
| Purchased | boolean |
| Remarks | truncated with expand |
| Created by | display_name |

**Interaction:** Row click → inquiry detail drawer or `/inquiries/[id]` if detail route added.

**Empty state:** CTA “Add first inquiry”.

---

### 4.3 Purchased products

**Source:** `customer_product_purchases` JOIN `products`, optional `inquiries`.

| Column | Notes |
|--------|-------|
| Product name | |
| Purchase status | `is_purchased` |
| Related inquiry | link to inquiry |
| Purchase date | `purchased_at` |

**Future:** Line items, quantity, invoice refs — extend table without breaking UI contract.

**Sync:** Maintained when inquiry marked purchased (server transaction).

---

### 4.4 Follow-up history

**Source:** `followups` ORDER BY `followup_date DESC`, `created_at DESC`.

| Column | Notes |
|--------|-------|
| Date | |
| Notes | full text |
| Created by | |

**Visual:** Newest first; badge “Latest” on most recent non-deleted entry.

**Rule:** Historical rows immutable except `followup.update` permission allowing edit with audit log entry.

---

### 4.5 Reminders

**Source:** `reminders` for `customer_id`.

**Group UI:**

- Overdue (red)
- Today
- Upcoming
- Completed (collapsed)

**Actions:** Complete (`reminder.complete`), Edit (`reminder.update`), Add (`reminder.create`).

**Computed status:** Use Asia/Kolkata day boundaries (shared `lib/datetime/ist.ts`).

---

### 4.6 Notes

**Phase 1 UI:** List from `customer_notes` chronologically; form to append note.

**Optional:** Deprecate single `customers.notes` field in UI in favor of threaded notes only.

Each note: author, timestamp, body; soft delete for admins optional.

---

### 4.7 Activity timeline

**Source:** `activity_logs` WHERE `customer_id = :id` OR metadata contains customer (prefer denormalized `customer_id` on all customer-related logs).

**Display:** Icon per module, human-readable message from `action` + `metadata`, relative time, actor.

**Ordering:** `created_at DESC`.

**Coverage:** Ensure these actions set `customer_id` on log:

- Customer CRUD
- Inquiry CRUD on this customer
- Follow-up / reminder events
- Purchase recorded
- Excel import affecting customer

---

## 5. Navigation and deep linking

| From | Link |
|------|------|
| Customers table | Row → `/customers/[id]` |
| Inquiries | Customer name → 360 |
| Follow-ups | Customer → 360 |
| Reminders | Customer → 360 |
| Dashboard recent inquiries | Same |

Optional hash sections: `/customers/[id]#follow-ups`.

---

## 6. Error and edge cases

| Case | UX |
|------|-----|
| Invalid UUID | 404 |
| Soft-deleted customer | 404 or “Archived” (decision required) |
| No permission | 403 |
| Customer exists but no inquiries | Empty sections with CTAs |

---

## 7. Acceptance criteria (360°)

1. Opening 360° for a customer with 10+ follow-ups shows ordered history without noticeable delay (< 2s target on broadband).
2. All inquiries for customer visible and linkable.
3. Purchase section reflects inquiry-driven purchases.
4. Reminder groups match IST “today” boundaries.
5. Activity timeline includes create/update events from all modules.
6. Quick actions respect RBAC (disabled + server enforced).
7. Mobile layout: header stacks; sections accordion on small screens.

---

## 8. Related documents

- [DATABASE_DESIGN.md](./DATABASE_DESIGN.md)
- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) — Phase 7
