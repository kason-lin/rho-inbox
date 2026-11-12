import 'server-only';
import { classify } from './priority';
import { adminClient } from './supabase/admin';
import type { InboxEvent, NewEvent, Status } from './types';

const TABLE = 'inbox_events';

function normalize(row: InboxEvent): InboxEvent {
  return { ...row, amount: row.amount == null ? null : Number(row.amount) };
}

function fail(error: { message: string } | null, what: string): never {
  throw new Error(`${what}: ${error?.message ?? 'unknown error'}`);
}

/** Every event, oldest snoozes woken up first. Demo-sized, so threads are built in memory. */
export async function loadEvents(): Promise<InboxEvent[]> {
  const db = adminClient();
  const wake = await db
    .from(TABLE)
    .update({ status: 'unread', snooze_until: null })
    .eq('status', 'snoozed')
    .lte('snooze_until', new Date().toISOString());
  if (wake.error) fail(wake.error, 'Waking snoozed events');

  const { data, error } = await db.from(TABLE).select('*').order('created_at', { ascending: false }).limit(1000);
  if (error) fail(error, 'Loading events');
  return (data as InboxEvent[]).map(normalize);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getEvent(id: string): Promise<InboxEvent | null> {
  if (!UUID.test(id)) return null;   // a malformed id is "not found", not a database error
  const { data, error } = await adminClient().from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) fail(error, 'Loading event');
  return data ? normalize(data as InboxEvent) : null;
}

/** Insert one event, classifying it on the way in. */
export async function insertEvent(e: NewEvent): Promise<InboxEvent> {
  const { priority, reason } = classify(e);
  const row = { ...e, priority, meta: { ...e.meta, ...(reason ? { reason } : {}) } };
  const { data, error } = await adminClient().from(TABLE).insert(row).select('*').single();
  if (error) fail(error, 'Inserting event');
  return normalize(data as InboxEvent);
}

export async function updateStatus(
  id: string,
  status: Status,
  opts: { snoozeUntil?: string | null; applyToThread?: boolean } = {},
): Promise<InboxEvent[]> {
  const db = adminClient();
  const patch = { status, snooze_until: status === 'snoozed' ? opts.snoozeUntil ?? null : null };

  let query = db.from(TABLE).update(patch);
  if (opts.applyToThread) {
    const event = await getEvent(id);
    if (!event) return [];
    query = query.eq('thread_id', event.thread_id);
    // Leave finished events alone, so "mark unread" doesn't resurrect a paid bill.
    if (status !== 'done') query = query.neq('status', 'done');
  } else {
    query = query.eq('id', id);
  }
  const { data, error } = await query.select('*');
  if (error) fail(error, 'Updating status');
  return (data as InboxEvent[]).map(normalize);
}

/** Latest invoice thread that can still move forward (sent → viewed → paid → deposited). */
export async function latestOpenInvoice(): Promise<InboxEvent | null> {
  const { data, error } = await adminClient()
    .from(TABLE)
    .select('*')
    .eq('source', 'invoicing')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) fail(error, 'Loading invoices');
  const seen = new Set<string>();
  for (const row of data as InboxEvent[]) {
    if (seen.has(row.thread_id)) continue;   // only each thread's newest event
    seen.add(row.thread_id);
    if (row.type !== 'invoice_deposited' && row.status !== 'done') return normalize(row);
  }
  return null;
}
