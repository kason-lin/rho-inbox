-- Rho Check-in: the weekly briefing that picks at most 3 decision cards.
-- Everything Check-in reads (balances, payments, transactions, usage, burn) is synthetic demo data
-- standing in for data Rho is assumed to have.

create type app_role as enum ('admin', 'member', 'account_manager');
create type checkin_card_type as enum ('payday_guard', 'suspicious_charge', 'subscription_review', 'burn_change');
create type checkin_card_status as enum ('proposed', 'approved', 'not_now', 'wrong');
create type checkin_feedback_kind as enum ('wrong', 'not_now');

create table app_users (
  id     text primary key,               -- 'maya', 'ana', 'dana'
  name   text not null,
  title  text not null,
  role   app_role not null
);

create table accounts (
  id          text primary key,          -- 'checking', 'treasury'
  name        text not null,
  last4       text not null,
  balance     numeric(14, 2) not null,
  updated_at  timestamptz not null default now()
);

create table scheduled_payments (
  id          uuid primary key default gen_random_uuid(),
  payee       text not null,
  kind        text not null check (kind in ('bill', 'payroll')),
  amount      numeric(12, 2) not null,
  due_on      date not null,
  account_id  text not null references accounts (id)
);

create table transactions (
  id             uuid primary key default gen_random_uuid(),
  vendor         text not null,
  amount         numeric(12, 2) not null,
  category       text not null,
  method         text not null check (method in ('card', 'ach', 'payroll')),
  card_last4     text,
  card_owner     text,
  recurring      boolean not null default false,
  occurred_at    timestamptz not null
);

-- From an optional login connector (e.g. Google Workspace): when anyone last used each tool.
create table vendor_usage (
  vendor          text primary key,
  last_login_at   timestamptz,
  card_owner_active boolean not null default true,
  locked          boolean not null default false   -- virtual card locked / tool cancelled
);

create table burn_months (
  month        date primary key,
  total        numeric(12, 2) not null,
  by_category  jsonb not null
);

-- Changes the engine knows are coming (new hires, a raise found in a signed contract email).
create table known_changes (
  id             uuid primary key default gen_random_uuid(),
  description    text not null,
  category       text not null,
  monthly_delta  numeric(12, 2) not null,
  source         text not null,             -- 'payroll' | 'contract_email'
  payroll        boolean not null default false
);

create table checkin_cards (
  id               uuid primary key default gen_random_uuid(),
  week_of          date not null,
  type             checkin_card_type not null,
  rule             text not null,           -- which trigger fired, e.g. 'unused_60_days'
  vendor           text,
  urgent           boolean not null,
  runway_days      numeric(8, 2),
  rank             int not null,
  title            text not null,
  question         text,                    -- "Move $5,000 from treasury?"
  why              text not null,           -- plain-language rule explanation for screen 5
  proof            jsonb not null,
  action           jsonb,                   -- prepared action; null for no-money cards
  status           checkin_card_status not null default 'proposed',
  data_as_of       timestamptz not null,
  inbox_event_id   uuid references inbox_events (id) on delete set null,
  decided_by       text references app_users (id),
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index checkin_cards_week_idx on checkin_cards (week_of, status, rank);

create table checkin_feedback (
  id          uuid primary key default gen_random_uuid(),
  card_type   checkin_card_type not null,
  rule        text not null,
  vendor      text,
  kind        checkin_feedback_kind not null,
  user_id     text references app_users (id),
  created_at  timestamptz not null default now()
);

create table audit_log (
  id          uuid primary key default gen_random_uuid(),
  actor       text not null,                -- user id or 'rho' for the engine
  role        text not null,
  event       text not null,                -- card_suggested, decision_approved, transfer_executed…
  card_id     uuid references checkin_cards (id) on delete set null,
  detail      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index audit_log_created_idx on audit_log (created_at desc);

-- Same pattern as inbox_events: the browser may read, only API routes (service role) write.
do $$
declare t text;
begin
  foreach t in array array['app_users', 'accounts', 'scheduled_payments', 'transactions', 'vendor_usage',
                           'burn_months', 'known_changes', 'checkin_cards', 'checkin_feedback', 'audit_log']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "demo data is readable" on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

alter publication supabase_realtime add table checkin_cards, accounts;
