-- One card per (week, type, rule, vendor). Concurrent engine runs (several open pages refetching at
-- once) could otherwise insert the same card more than once.

-- Remove duplicates that already exist, keeping the earliest card of each key, and their Inbox rows.
with ranked as (
  select id, inbox_event_id,
         row_number() over (partition by week_of, type, rule, vendor order by created_at, id) as n
  from checkin_cards
), extra as (
  select id, inbox_event_id from ranked where n > 1
), gone as (
  delete from checkin_cards where id in (select id from extra) returning inbox_event_id
)
delete from inbox_events where id in (select inbox_event_id from gone where inbox_event_id is not null);

alter table checkin_cards
  add constraint checkin_cards_one_per_week unique nulls not distinct (week_of, type, rule, vendor);
