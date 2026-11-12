-- Rho Inbox: one normalized table for events from every Rho product.

create type inbox_source as enum ('cards', 'bill_pay', 'invoicing', 'treasury', 'approvals');
create type inbox_priority as enum ('needs_action', 'fyi');
create type inbox_status as enum ('unread', 'read', 'done', 'snoozed');
create type inbox_action as enum ('approve', 'pay', 'dispute');

create table inbox_events (
  id            uuid primary key default gen_random_uuid(),
  source        inbox_source   not null,
  type          text           not null,          -- e.g. bill_due, card_charge, invoice_paid
  title         text           not null,
  summary       text,
  amount        numeric(12, 2),
  counterparty  text,
  priority      inbox_priority not null default 'fyi',
  status        inbox_status   not null default 'unread',
  thread_id     uuid           not null default gen_random_uuid(),  -- groups related events
  action_type   inbox_action,                     -- the one action this event offers, if any
  due_at        timestamptz,                      -- bills and invoices
  snooze_until  timestamptz,
  meta          jsonb          not null default '{}'::jsonb,  -- cardholder, category, balance, priority reason…
  created_at    timestamptz    not null default now()
);

create index inbox_events_inbox_idx  on inbox_events (status, priority, created_at desc);
create index inbox_events_thread_idx on inbox_events (thread_id, created_at);

-- The browser reads with the anon key and listens for changes; every write goes through
-- the Next.js API routes with the service-role key, which bypasses RLS.
alter table inbox_events enable row level security;
create policy "demo data is readable" on inbox_events for select to anon, authenticated using (true);

alter publication supabase_realtime add table inbox_events;
