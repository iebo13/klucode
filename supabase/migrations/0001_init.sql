-- ════════════════════════════════════════════════════════════════════════
-- CafeTab — 0001 init: schema, the append-only events table, derived balance.
--
-- §3 THE ONE PRINCIPLE: a debt is a thing that happened; a payment is a thing
-- that happened; neither can be un-happened. We store immutable EVENTS and
-- DERIVE the balance from them. No table ever stores "how much is owed".
-- ════════════════════════════════════════════════════════════════════════

-- ─── Enums ──────────────────────────────────────────────────────────────
create type staff_role as enum ('owner', 'manager', 'employee');
create type event_type as enum ('charge', 'payment');

-- ─── Staff (one row per auth user) ──────────────────────────────────────
create table staff (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null,
  role       staff_role not null default 'employee',
  created_at timestamptz not null default now()
);

-- ─── Customers ──────────────────────────────────────────────────────────
create table customers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text,
  created_by uuid not null references staff (id),
  created_at timestamptz not null default now()
);

-- ─── Events — append-only; the entire financial history ─────────────────
-- Money is always positive integer cents; `type` carries the sign. Voiding
-- is the ONLY correction (a row is struck through, never edited or deleted).
create table events (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references customers (id),
  type         event_type not null,
  amount_cents integer not null check (amount_cents > 0),
  label        text, -- "Lunch", item note, or a free-text payment note
  method       text, -- payments only: 'cash' | 'card' | 'transfer'
  created_by   uuid not null references staff (id),
  created_at   timestamptz not null default now(),
  voided_by    uuid references staff (id),
  voided_at    timestamptz,

  -- A void is all-or-nothing: both fields set, or neither.
  constraint void_pair check ((voided_by is null) = (voided_at is null)),

  -- §0/§11 make illegal states unrepresentable at the lowest layer: a charge
  -- never carries a method; a payment always carries a valid one.
  -- A CHECK is satisfied by NULL, so `method is not null` is load-bearing:
  -- without it a payment with a NULL method would slip through (NULL IN (..) → NULL).
  constraint method_matches_type check (
    (type = 'charge' and method is null)
    or (type = 'payment' and method is not null and method in ('cash', 'card', 'transfer'))
  )
);

-- Timeline reads are "this customer's events, oldest → newest".
create index events_customer_idx on events (customer_id, created_at);

-- ─── Derived balances — the present, always recalculated ────────────────
-- §3 as schema: there is no balance column anywhere. The current balance is
-- a SUM() over the surviving (non-void) events, computed at read time.
-- security_invoker = the view obeys the querying user's RLS, never bypasses it.
create view customer_balances
with (security_invoker = true)
as
select
  c.id as customer_id,
  coalesce(
    sum(
      case
        when e.voided_at is not null then 0
        when e.type = 'charge' then e.amount_cents
        when e.type = 'payment' then -e.amount_cents
      end
    ),
    0
  ) as balance_cents
from customers c
left join events e on e.customer_id = c.id
group by c.id;

-- ─── Café settings — exactly one configuration row ─────────────────────
-- Single-row table: the boolean PK is always true, so a second row can't exist.
create table cafe_settings (
  id                    boolean primary key default true,
  cafe_name             text not null default 'CafeTab',
  currency              text not null default 'EUR',
  time_zone             text not null default 'Europe/Madrid',
  alert_enabled         boolean not null default true,
  alert_threshold_cents integer not null default 5000 check (alert_threshold_cents >= 0),
  constraint single_row check (id is true)
);

insert into cafe_settings (id) values (true);

-- ─── Auto-provision a staff profile for every auth user ─────────────────
-- Bootstrapping (§14 "role is loaded from staff"): the first person to sign
-- up is the café owner who set this up; everyone after is an employee until
-- the owner promotes them on the Team screen. security definer so it can
-- write the profile before any RLS/role exists.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.staff (id, name, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'name', ''), new.email),
    case
      when not exists (select 1 from public.staff) then 'owner'
      else 'employee'
    end::public.staff_role
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ─── Realtime — "everyone sees the same thing, now" (§9) ─────────────────
-- Screens subscribe to events (balances/timelines re-derive) and to customers
-- (the address book updates live). Guarded so these migrations also apply on a
-- plain Postgres used for testing, where the Supabase publication is absent.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.events';
    execute 'alter publication supabase_realtime add table public.customers';
  end if;
end;
$$;
