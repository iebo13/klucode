# CafeTab

A shared, permanent, trustworthy ledger for a café's customer tabs. Staff let
trusted customers leave without paying and settle up later; CafeTab is the one
place that record lives — so a new shift can walk in and trust the number.

It answers four questions instantly:

1. Who owes us money right now, and how much?
2. What did each person buy, and when?
3. What has been paid, by whom, and how?
4. Who recorded each of these things?

It is an internal, staff-only tool for **one** café. It is not a POS, not
accounting software, not customer-facing, not multi-tenant.

---

## The one principle that outranks everything

> **A debt is a thing that happened. A payment is a thing that happened.
> Neither can be un-happened.**

CafeTab never stores "how much a customer currently owes" as an editable number.
It stores immutable **events** — each charge, each payment — and **derives** the
balance from them every time it is shown:

- The current balance is always a `SUM()` over events, computed at read time. It
  is never a column anyone can type into.
- A mistake is corrected by recording a **new** event, or by marking an event
  **void** — never by editing or deleting an old one. A voided row stays on the
  record, struck through, attributed to whoever voided it.

This is enforced **in the database, not just the app**. The `events` table is
append-only by Row-Level Security policy _and_ a trigger:

| Operation | Who                       | Result                                     |
| --------- | ------------------------- | ------------------------------------------ |
| `INSERT`  | anyone signed in          | allowed, recorded as themselves            |
| `UPDATE`  | owner only, to void once  | allowed (sets `voided_by` / `voided_at`)   |
| `UPDATE`  | anything else             | rejected by RLS **and** the trigger        |
| `DELETE`  | everyone, incl. the owner | denied — no policy exists, removes nothing |

`deriveBalanceCents()` (in `domain/balances.ts`) is the single implementation of
the rule in code; the SQL view `customer_balances` applies the identical `CASE`.
The two cannot drift.

---

## Tech stack

| Concern      | Choice                                                        |
| ------------ | ------------------------------------------------------------- |
| Framework    | Next.js (App Router) + React 19 — Server Components & Actions |
| Language     | TypeScript, `strict: true`                                    |
| Backend / DB | Supabase (Postgres + Auth + Realtime + RLS)                   |
| Styling      | Tailwind CSS (hand-rolled components, no UI library)          |
| Validation   | Zod, once per trust boundary                                  |
| Realtime     | Supabase Realtime channels → `router.refresh()`               |
| Tests        | Vitest (money math) + Playwright (append-only guarantee)      |

Money is **integer cents** everywhere, branded as `Cents`. Currency is EUR,
formatted `€1,234.56`. Floats of euros never appear.

---

## Architecture — separation of concerns

Dependencies point downward only. The UI never runs ad-hoc Supabase queries; it
goes through the data-access layer, which returns clean domain types.

```
UI            app/** + components/**     React components. Render state.
Data access   lib/data/* + app/actions/* All Supabase reads/writes. Return domain types.
Domain        domain/*                   Pure types + pure functions. No I/O. Unit-tested.
Platform      lib/supabase/*, lib/money,  Clients, capability map, money utils.
              lib/permissions
Database      supabase/migrations/*       The real source of truth & the real lock:
                                          schema + constraints + RLS + triggers + views.
```

- `domain/` knows _what things are_ and _how balances derive_. It imports no
  Supabase client. `deriveBalanceCents`, `withRunningBalance`, `summariseBalance`
  live here.
- `lib/data/` is the only place that queries Supabase. Each function returns
  domain types, never raw rows.
- `lib/permissions.ts` is the single capability map in code, mirrored by RLS.

See `app/actions/` for the Server Actions (`recordCharge`, `recordPayment`,
`voidEvent`, `addCustomer`, `changeRole`, `inviteColleague`, `updateSettings`).

---

## Capabilities

| Capability                             | Employee | Manager | Owner |
| -------------------------------------- | :------: | :-----: | :---: |
| Find customers, see balances & history |    ✅    |   ✅    |  ✅   |
| Record a charge / payment              |    ✅    |   ✅    |  ✅   |
| Add a customer                         |    ✅    |   ✅    |  ✅   |
| See Reports                            |    ❌    |   ✅    |  ✅   |
| Void a record                          |    ❌    |   ❌    |  ✅   |
| Export data (CSV)                      |    ❌    |   ❌    |  ✅   |
| Manage team (add / role)               |    ❌    |   ❌    |  ✅   |

These are enforced where the records are kept: Reports and Export go through
`security definer` RPCs that raise for the wrong role; voiding is owner-only in
RLS; the UI merely hides what the data layer already forbids.

---

## Getting started

### 1. Prerequisites

- Node.js 20+
- The [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase`)

### 2. Install

```bash
npm install
```

### 3. Start Supabase locally and apply the schema + seed

```bash
supabase start          # boots local Postgres, Auth, Realtime
npm run db:reset        # runs migrations 0001/0002, then seed.sql
```

`supabase start` prints your local **API URL**, **anon key**, and
**service_role key**.

### 4. Configure environment

```bash
cp .env.example .env.local
```

Fill in from the values `supabase start` printed:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
# Server-only. Powers the Team "invite" flow and the append-only e2e test.
# Never reaches the browser (guarded by `import 'server-only'`).
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

### 5. Run

```bash
npm run dev   # http://localhost:3000
```

### Seeded accounts

The seed creates three sign-ins (password for all: **`password123`**):

| Email                   | Role     |
| ----------------------- | -------- |
| `owner@cafetab.test`    | Owner    |
| `manager@cafetab.test`  | Manager  |
| `employee@cafetab.test` | Employee |

The **first** person ever to sign up becomes the owner; everyone after joins as
an employee for the owner to promote on the Team screen.

---

## Testing

```bash
npm run typecheck   # tsc --noEmit, strict
npm run lint        # ESLint (no any, no non-null !, no TODO)
npm run format:check

npm test            # Vitest — money math + the void-exclusion rule
npm run test:e2e    # Playwright — proves events are append-only (needs Supabase env)
```

`tests/balances.test.ts` covers charges, payments, void exclusion, credit, and
the `Cents` brand. `tests/append-only.e2e.ts` connects to your Supabase and
proves that `DELETE` removes nothing, a non-void `UPDATE` is rejected, and
voiding works exactly once — it skips itself if the env vars are absent.

---

## Realtime

Every screen that shows balances or history mounts a small client component that
subscribes to the `events` (and `customers`) table and re-runs the server render
on any change. Open two tabs: record a charge in one and the other updates with
no manual refresh — everyone sees the same tab, now.

---

## Project layout

```
app/
  (auth)/login/              Sign in / create account
  (app)/                     Auth-guarded shell (sidebar / bottom tabs)
    dashboard/               Total outstanding, today's figures, biggest debtors
    customers/               Searchable roster  + [id] detail timeline + charge/pay
    reports/                 Charged vs collected (manager+), CSV export (owner)
    team/                    Roles & invites (owner)
    settings/                Café name, time zone, alert threshold
  actions/                   'use server' writes, validated with Zod
  api/export/                Owner-only CSV download
domain/                      Pure types + balance derivation (unit-tested)
lib/
  supabase/                  Browser / server / admin clients, generated-style types
  data/                      Queries → domain types
  money.ts permissions.ts    DRY money + the capability map
components/                  Hand-rolled Tailwind UI
supabase/migrations/         0001 schema, 0002 RLS + triggers + RPCs
supabase/seed.sql            A working local dataset
tests/                       balances.test.ts, append-only.e2e.ts
```

---

## Notes for deployment

- The app uses the **anon key** in the browser; RLS does the gating. The
  service-role key is server-only and never bundled into the client.
- Deploy the app to Vercel and point the env vars at your hosted Supabase
  project. Run the migrations there with `supabase db push`.
- The `customer_balances` view uses `security_invoker`, so it always respects
  the querying user's RLS.
