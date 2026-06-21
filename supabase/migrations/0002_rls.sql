-- ════════════════════════════════════════════════════════════════════════
-- CafeTab — 0002 rules: the lock lives with the data (§7).
-- "Hiding a button is a courtesy; the real lock is deeper."
--
-- The centrepiece is the append-only guarantee for `events` (§3):
--   INSERT  → allowed (recorded as yourself)
--   UPDATE  → denied, except the single owner-only act of voiding
--   DELETE  → no policy exists, so it is denied to everyone, owner included
-- A trigger backstops the policies so even a privileged path cannot rewrite
-- history.
-- ════════════════════════════════════════════════════════════════════════

alter table staff enable row level security;
alter table customers enable row level security;
alter table events enable row level security;
alter table cafe_settings enable row level security;

-- ─── Helper: the caller's role, read once (§8 mirrored by data) ─────────
-- security definer so it can read `staff` regardless of the caller's own RLS;
-- the (select auth.uid()) wrapper lets Postgres cache it per statement.
create function current_staff_role()
returns staff_role
language sql
security definer
stable
set search_path = ''
as $$
  select role from public.staff where id = (select auth.uid());
$$;

-- ─── STAFF ──────────────────────────────────────────────────────────────
-- Everyone signed in can read staff (needed to show "who recorded this" and
-- the Team list). Only the owner manages the team (§8).
create policy staff_read on staff
  for select using ((select auth.uid()) is not null);

create policy staff_write on staff
  for all
  using (current_staff_role() = 'owner')
  with check (current_staff_role() = 'owner');

-- ─── CUSTOMERS ──────────────────────────────────────────────────────────
-- Anyone signed in may read and add customers; manager+ may edit basic info.
create policy cust_read on customers
  for select using ((select auth.uid()) is not null);

create policy cust_insert on customers
  for insert
  with check ((select auth.uid()) is not null and created_by = (select auth.uid()));

create policy cust_update on customers
  for update
  using (current_staff_role() in ('owner', 'manager'))
  with check (current_staff_role() in ('owner', 'manager'));

-- ─── CAFÉ SETTINGS ──────────────────────────────────────────────────────
-- Everyone signed in reads settings (café name, alert threshold); only the
-- owner edits them. The single row is fixed by the migration — no insert/delete.
create policy settings_read on cafe_settings
  for select using ((select auth.uid()) is not null);

create policy settings_update on cafe_settings
  for update
  using (current_staff_role() = 'owner')
  with check (current_staff_role() = 'owner');

-- ─── EVENTS — the heart of §3 ───────────────────────────────────────────
-- Anyone signed in may READ the full history.
create policy ev_read on events
  for select using ((select auth.uid()) is not null);

-- Anyone signed in may INSERT a new event, recorded as themselves.
create policy ev_insert on events
  for insert
  with check ((select auth.uid()) is not null and created_by = (select auth.uid()));

-- ONLY the owner may UPDATE, and ONLY to void a not-yet-void row, recording
-- themselves as the voider.
create policy ev_void on events
  for update
  using (current_staff_role() = 'owner' and voided_at is null)
  with check (current_staff_role() = 'owner' and voided_by = (select auth.uid()));

-- NO delete policy exists → DELETE is denied to everyone, including the owner.

-- ─── Append-only trigger — history cannot be rewritten (§3) ─────────────
-- Backstops ev_void: an UPDATE may change NOTHING except setting the void
-- fields exactly once. Defends the invariant even on paths that bypass RLS.
create function enforce_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.id, new.customer_id, new.type, new.amount_cents, new.label,
      new.method, new.created_by, new.created_at)
     is distinct from
     (old.id, old.customer_id, old.type, old.amount_cents, old.label,
      old.method, old.created_by, old.created_at)
  then
    raise exception 'events are append-only: only voiding is permitted';
  end if;

  if old.voided_at is not null then
    raise exception 'event already voided; history cannot be rewritten';
  end if;

  return new;
end;
$$;

create trigger events_append_only
  before update on events
  for each row execute function enforce_append_only();

-- ─── Reports — role-gated by data, not just by routing (§7) ─────────────
-- Employees can legitimately read raw events, so reports are not secret data;
-- but the aggregate is exposed through a definer RPC that raises for employees,
-- so the lock is real even if the route is reached.
create function report_range(days int)
returns table (day date, charged_cents bigint, collected_cents bigint)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(public.current_staff_role() in ('manager', 'owner'), false) = false then
    raise exception 'reports require manager or owner';
  end if;

  return query
    select
      date_trunc('day', e.created_at)::date as day,
      coalesce(sum(e.amount_cents) filter (where e.type = 'charge' and e.voided_at is null), 0)::bigint,
      coalesce(sum(e.amount_cents) filter (where e.type = 'payment' and e.voided_at is null), 0)::bigint
    from public.events e
    where e.created_at >= now() - make_interval(days => days)
    group by 1
    order by 1;
end;
$$;

-- ─── Dashboard — today's collected vs new debt, in the café's timezone ──
-- security invoker: runs under the caller's RLS (any signed-in staff). "Today"
-- is computed in the configured time zone so the morning glance is honest.
create function today_totals()
returns table (collected_today_cents bigint, charged_today_cents bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with cfg as (select time_zone as tz from public.cafe_settings limit 1)
  select
    coalesce(sum(e.amount_cents) filter (where e.type = 'payment'), 0)::bigint,
    coalesce(sum(e.amount_cents) filter (where e.type = 'charge'), 0)::bigint
  from public.events e
  cross join cfg
  where e.voided_at is null
    and e.created_at >= (date_trunc('day', now() at time zone cfg.tz) at time zone cfg.tz);
$$;

-- ─── Export — owner only, locked at the data layer (§8) ─────────────────
-- A flat, human-readable projection of every event for CSV export. Raises for
-- anyone who is not the owner, so a hidden button is not the only guard.
create function export_events()
returns table (
  event_id     uuid,
  customer_name text,
  type         event_type,
  amount_cents integer,
  label        text,
  method       text,
  recorded_by  text,
  recorded_at  timestamptz,
  voided_by    text,
  voided_at    timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(public.current_staff_role() = 'owner', false) = false then
    raise exception 'export requires owner';
  end if;

  return query
    select
      e.id, c.name, e.type, e.amount_cents, e.label, e.method,
      rec.name, e.created_at, voider.name, e.voided_at
    from public.events e
    join public.customers c on c.id = e.customer_id
    join public.staff rec on rec.id = e.created_by
    left join public.staff voider on voider.id = e.voided_by
    order by e.created_at;
end;
$$;

-- ─── Function grants — least privilege (§7) ─────────────────────────────
revoke execute on function report_range(int) from public;
revoke execute on function export_events() from public;
grant execute on function current_staff_role() to authenticated;
grant execute on function report_range(int) to authenticated;
grant execute on function export_events() to authenticated;
grant execute on function today_totals() to authenticated;
