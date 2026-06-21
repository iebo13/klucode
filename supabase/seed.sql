-- ════════════════════════════════════════════════════════════════════════
-- CafeTab — local development seed (run by `supabase db reset`).
--
-- Creates three sign-ins (password for all: "password123"), a handful of
-- customers, and a week of charges/payments — including a settled tab and a
-- voided mistake — so every screen has real data to render.
--
-- Inserting the auth users fires handle_new_user(), which auto-provisions the
-- matching `staff` rows (the first becomes 'owner'); we then promote one to
-- 'manager'. Targets a recent Supabase CLI (GoTrue) schema.
-- ════════════════════════════════════════════════════════════════════════

-- pgcrypto (crypt/gen_salt) ships with Supabase in the `extensions` schema.
create extension if not exists pgcrypto with schema extensions;

-- ─── Sign-ins ───────────────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111',
   'authenticated', 'authenticated', 'owner@cafetab.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Olivia Owner"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222',
   'authenticated', 'authenticated', 'manager@cafetab.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Manny Manager"}',
   now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333',
   'authenticated', 'authenticated', 'employee@cafetab.test',
   crypt('password123', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"name":"Evan Employee"}',
   now(), now(), '', '', '', '');

-- Email identities (required for password sign-in).
insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '{"sub":"11111111-1111-1111-1111-111111111111","email":"owner@cafetab.test"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222',
   '{"sub":"22222222-2222-2222-2222-222222222222","email":"manager@cafetab.test"}', 'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333',
   '{"sub":"33333333-3333-3333-3333-333333333333","email":"employee@cafetab.test"}', 'email', now(), now(), now());

-- Promote the second sign-in to manager (the trigger made them an employee).
update public.staff set role = 'manager' where id = '22222222-2222-2222-2222-222222222222';

-- ─── Customers ──────────────────────────────────────────────────────────
insert into public.customers (id, name, phone, created_by, created_at) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'Alice Moreau',   '+34 600 111 222', '11111111-1111-1111-1111-111111111111', now() - interval '20 days'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'Bruno Costa',    '+34 600 333 444', '22222222-2222-2222-2222-222222222222', now() - interval '15 days'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'Carmen Ruiz',    '+34 600 555 666', '11111111-1111-1111-1111-111111111111', now() - interval '12 days'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'Diego Fernández', null,             '33333333-3333-3333-3333-333333333333', now() - interval '8 days'),
  ('aaaaaaaa-0000-0000-0000-000000000005', 'Elena Popov',    '+34 600 777 888', '22222222-2222-2222-2222-222222222222', now() - interval '5 days');

-- ─── Events — the financial history (positive cents; type carries sign) ──
insert into public.events (customer_id, type, amount_cents, label, method, created_by, created_at, voided_by, voided_at) values
  -- Alice: owes a running tab.
  ('aaaaaaaa-0000-0000-0000-000000000001', 'charge',  1250, 'Lunch menu',     null,       '11111111-1111-1111-1111-111111111111', now() - interval '6 days',  null, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'charge',   380, 'Flat white',     null,       '33333333-3333-3333-3333-333333333333', now() - interval '4 days',  null, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'payment',  800, 'Part payment',   'cash',     '22222222-2222-2222-2222-222222222222', now() - interval '2 days',  null, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'charge',   420, 'Croissant x2',   null,       '33333333-3333-3333-3333-333333333333', now() - interval '1 days',  null, null),

  -- Bruno: bigger tab, one card payment.
  ('aaaaaaaa-0000-0000-0000-000000000002', 'charge',  3600, 'Team breakfast', null,       '22222222-2222-2222-2222-222222222222', now() - interval '5 days',  null, null),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'payment', 2000, 'On account',     'card',     '11111111-1111-1111-1111-111111111111', now() - interval '3 days',  null, null),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'charge',   650, 'Sandwich',       null,       '33333333-3333-3333-3333-333333333333', now() - interval '1 days',  null, null),

  -- Carmen: settled in full (balance derives to zero → "Settled").
  ('aaaaaaaa-0000-0000-0000-000000000003', 'charge',  1500, 'Dinner',         null,       '11111111-1111-1111-1111-111111111111', now() - interval '7 days',  null, null),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'payment', 1500, 'Settled up',     'transfer', '11111111-1111-1111-1111-111111111111', now() - interval '6 days',  null, null),

  -- Diego: a voided mistake stays on the record, struck through.
  ('aaaaaaaa-0000-0000-0000-000000000004', 'charge',   900, 'Brunch',         null,       '33333333-3333-3333-3333-333333333333', now() - interval '3 days',  null, null),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'charge',  9999, 'Typo — wrong amount', null,  '33333333-3333-3333-3333-333333333333', now() - interval '3 days',
   '11111111-1111-1111-1111-111111111111', now() - interval '2 days'),

  -- Elena: brand-new small tab today.
  ('aaaaaaaa-0000-0000-0000-000000000005', 'charge',   540, 'Cappuccino + cake', null,    '22222222-2222-2222-2222-222222222222', now() - interval '4 hours', null, null);
