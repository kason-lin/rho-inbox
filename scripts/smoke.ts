/**
 * End-to-end check of the API against a running dev server and the real database.
 * It changes data (pays a bill, snoozes, simulates), so run `npm run seed` afterwards.
 *
 *   npm run dev -- -p 3100   (in another terminal)
 *   BASE_URL=http://localhost:3100 npm run smoke
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { InboxThread } from '../src/lib/types';

config({ path: '.env.local' });
const BASE = process.env.BASE_URL ?? 'http://localhost:3100';

let failures = 0;
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? `  (${detail})` : ''}`);
}

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json() };
}

const threads = async (query = '') => (await call('GET', `/api/events${query}`)).body.threads as InboxThread[];

async function main() {
  // Reads and filters
  const summary = await call('GET', '/api/summary');
  check('summary returns counts', summary.status === 200 && typeof summary.body.needs_action === 'number', `needs_action=${summary.body.needs_action}, unread=${summary.body.unread}`);

  const all = await threads();
  check('lists inbox threads', all.length > 10, `${all.length} threads`);
  const needs = await threads('?priority=needs_action');
  check('filters by priority', needs.length === summary.body.needs_action && needs.every(t => t.priority === 'needs_action'), `${needs.length}`);
  check('filters by source', (await threads('?source=cards')).every(t => t.source === 'cards'));
  check('searches', (await threads('?q=amazon%20web')).some(t => t.head.counterparty === 'Amazon Web Services'));
  check('groups threads', all.some(t => t.events.length >= 4), 'an invoice thread has 4 events');
  check('rejects bad filters', (await call('GET', '/api/events?source=crypto')).status === 400);

  // Pay the AWS bill
  const aws = needs.find(t => t.head.counterparty === 'Amazon Web Services');
  check('AWS bill needs action', !!aws && aws.actions.includes('pay'), aws?.reason ?? 'missing');
  if (aws) {
    const wrong = await call('POST', `/api/events/${aws.head.id}/action`, { action: 'dispute' });
    check('rejects the wrong action', wrong.status === 409, wrong.body.error);
    const paid = await call('POST', `/api/events/${aws.head.id}/action`, { action: 'pay' });
    check('pays the bill', paid.status === 200 && paid.body.follow_up?.type === 'payment_scheduled', paid.body.follow_up?.summary);
    const again = await call('POST', `/api/events/${aws.head.id}/action`, { action: 'pay' });
    check('refuses to pay twice', again.status === 409);
    const after = (await threads()).find(t => t.thread_id === aws.thread_id);
    check('thread moves to FYI with the follow-up', after?.priority === 'fyi' && after.events.length === 2);
    const s2 = await call('GET', '/api/summary');
    check('needs-action count drops by one', s2.body.needs_action === summary.body.needs_action - 1, `${s2.body.needs_action}`);
  }

  // Read / snooze / done
  const fyi = (await threads('?priority=fyi')).find(t => t.status === 'unread');
  if (fyi) {
    const read = await call('PATCH', `/api/events/${fyi.head.id}`, { status: 'read', apply_to_thread: true });
    check('marks a thread read', read.status === 200 && read.body.events.every((e: { status: string }) => e.status === 'read'));
  }
  const target = (await threads())[0];
  check('snooze needs a time', (await call('PATCH', `/api/events/${target.head.id}`, { status: 'snoozed' })).status === 400);
  const until = new Date(Date.now() + 3 * 3_600_000).toISOString();
  await call('PATCH', `/api/events/${target.head.id}`, { status: 'snoozed', snooze_until: until, apply_to_thread: true });
  check('snoozed thread leaves the inbox', !(await threads()).some(t => t.thread_id === target.thread_id) &&
    (await threads('?status=snoozed')).some(t => t.thread_id === target.thread_id));
  check('unknown id is a 404', (await call('PATCH', '/api/events/not-a-real-id', { status: 'read' })).status === 404);

  // Simulate + realtime: the browser's anon/publishable key should see the insert live
  const browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  check('browser key can read', !(await browser.from('inbox_events').select('id').limit(1)).error);
  const attempt = await browser.from('inbox_events').delete().neq('id', '00000000-0000-0000-0000-000000000000').select();
  check('browser key cannot write', (attempt.data ?? []).length === 0, 'RLS allows reads only');

  const live = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no realtime insert within 10s')), 10_000);
    const channel = browser
      .channel('smoke')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inbox_events' }, payload => {
        clearTimeout(timer);
        browser.removeChannel(channel);
        resolve((payload.new as { title: string }).title);
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          // Postgres change listeners attach a beat after SUBSCRIBED; firing instantly can miss the insert.
          await new Promise(r => setTimeout(r, 1000));
          const sim = await call('POST', '/api/simulate', { scenario: 'unusual_charge' });
          check('simulates an unusual charge', sim.status === 201 && sim.body.event.priority === 'needs_action', sim.body.event?.meta?.reason);
        }
      });
  });
  try {
    check('realtime delivers the new event', true, await live);
  } catch (e) {
    check('realtime delivers the new event', false, (e as Error).message);
  }

  const before = (await threads('?source=invoicing')).find(t => ['invoice_viewed', 'invoice_sent', 'invoice_paid'].includes(t.head.type));
  const inv = await call('POST', '/api/simulate', { scenario: 'invoice_progress' });
  check('advances an invoice thread', inv.status === 201 && (!before || inv.body.event.thread_id === before.thread_id || inv.body.event.type === 'invoice_sent'), `${inv.body.event?.title}`);

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
