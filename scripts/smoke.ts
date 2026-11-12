/**
 * End-to-end check of the API against a running dev server and the real database,
 * following the demo story. It changes data, so it re-seeds first; run `npm run seed` afterwards.
 *
 *   npm run dev -- -p 3100   (in another terminal)
 *   npm run seed && npm run smoke
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import type { CardView } from '../src/lib/checkin/view';
import type { InboxThread } from '../src/lib/types';

config({ path: '.env.local', quiet: true });
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
const checkin = async (as = 'maya') => (await call('GET', `/api/checkin?as=${as}`)).body as { cards: CardView[]; others: string[]; accounts: { id: string; balance: number }[] };
const decide = (id: string, decision: string, as = 'maya') => call('POST', `/api/checkin/cards/${id}/decision`, { decision, as });

async function main() {
  // ---------- Monday check-in (screen 1) ----------
  const monday = await checkin();
  check('3 cards, in the spec order', monday.cards.map(c => c.type).join() === 'payday_guard,subscription_review,burn_change',
    monday.cards.map(c => c.title).join(' | '));
  check('"14 other things look fine"', monday.others.length === 14, `${monday.others.length}`);
  const [payday, mixpanel] = monday.cards;
  check('payday card prepares a $5,000 transfer', payday.question === 'Move $5,000 from treasury?' && payday.action?.kind === 'transfer');
  check('cards show when their data was updated', !!payday.data_as_of);

  // ---------- Inbox mirrors it ----------
  const summary = await call('GET', '/api/summary');
  check('Inbox: the same 3 things need action', summary.body.needs_action === 3, summary.body.items.map((i: { title: string }) => i.title).join(' | '));
  const all = await threads();
  check('Inbox lists the full feed', all.length >= 15, `${all.length} threads`);
  check('Inbox filters by source', (await threads('?source=cards')).every(t => t.source === 'cards'));
  check('Inbox search', (await threads('?q=northwind')).length === 1);
  check('Inbox groups an invoice thread', all.some(t => t.events.length >= 4));
  check('Inbox rejects bad filters', (await call('GET', '/api/events?source=crypto')).status === 400);

  // ---------- Guardrails ----------
  const asAna = await checkin('ana');
  const anaBurn = asAna.cards.find(c => c.type === 'burn_change');
  check('teammate view hides payroll details', !!anaBurn?.redacted && !JSON.stringify(anaBurn.proof).includes('Priya Shah'));
  check('teammate cannot approve', asAna.cards.every(c => !c.can_approve) && (await decide(payday.id, 'approve', 'ana')).status === 403);
  const asDana = await checkin('dana');
  check('account manager sees the same cards', JSON.stringify(asDana.cards.map(c => c.proof)) === JSON.stringify(monday.cards.map(c => c.proof)));
  check('account manager cannot decide', (await decide(payday.id, 'not_now', 'dana')).status === 403);

  // ---------- Approve the transfer (screens 2–4) ----------
  const card = await call('GET', `/api/checkin/cards/${payday.id}?as=maya`);
  check('proof screen: payments and balances', card.status === 200 && card.body.card.proof.length === 3);
  const approved = await decide(payday.id, 'approve');
  const checking = approved.body.accounts?.find((a: { id: string }) => a.id === 'checking');
  check('approve: "Payroll is covered."', approved.status === 200 && approved.body.done.headline === 'Payroll is covered.', approved.body.done?.detail);
  check('checking is now $16,800', checking?.balance === 16800, `${checking?.balance}`);
  check('the next card is the unused tool', approved.body.next?.id === mixpanel.id, approved.body.next?.title);
  check('cannot approve twice', (await decide(payday.id, 'approve')).status === 409);
  const paydayThread = (await threads()).find(t => t.events.some(e => e.meta.checkin_card_id === payday.id));
  check('Inbox thread moved to FYI with the transfer note', paydayThread?.priority === 'fyi' && paydayThread.head.title.startsWith('Moved $5,000.00'));

  // ---------- "This is wrong" (screen 5) ----------
  const wrong = await decide(mixpanel.id, 'wrong');
  check('"This is wrong" is recorded', wrong.status === 200, wrong.body.done?.detail);
  const after = await checkin();
  check('Mixpanel is muted; burn remains', after.cards.map(c => c.type).join() === 'burn_change', after.cards.map(c => c.title).join(' | '));

  // ---------- Live duplicate charge, disputed from the Inbox ----------
  const browser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const attempt = await browser.from('inbox_events').delete().neq('id', '00000000-0000-0000-0000-000000000000').select();
  check('browser key is read-only', (attempt.data ?? []).length === 0);

  let simulated: { card: CardView | null; event: { id: string } | null } | null = null;
  const live = new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no realtime insert within 10s')), 10_000);
    const channel = browser
      .channel('smoke')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'inbox_events' }, payload => {
        const row = payload.new as { type: string; title: string };
        if (row.type !== 'checkin_suspicious_charge') return;
        clearTimeout(timer);
        browser.removeChannel(channel);
        resolve(row.title);
      })
      .subscribe(async status => {
        if (status !== 'SUBSCRIBED') return;
        await new Promise(r => setTimeout(r, 1000));   // listeners attach a beat after SUBSCRIBED
        const sim = await call('POST', '/api/simulate', { scenario: 'duplicate_charge' });
        simulated = sim.body;
        check('simulate a duplicate charge', sim.status === 201 && sim.body.card?.urgent === true, sim.body.card?.title);
      });
  });
  try {
    check('it arrives live in the Inbox', true, await live);
  } catch (e) {
    check('it arrives live in the Inbox', false, (e as Error).message);
  }
  const withDup = await checkin();
  check('urgent card jumps to the top of Check-in', withDup.cards[0]?.type === 'suspicious_charge', withDup.cards.map(c => c.title).join(' | '));
  const sim = simulated as { card: CardView | null; event: { id: string } | null } | null;
  if (sim?.event) {
    const disputed = await call('POST', `/api/events/${sim.event.id}/action`, { action: 'dispute', as: 'maya' });
    check('dispute from the Inbox row', disputed.status === 200 && disputed.body.done?.headline === 'Dispute submitted.');
  }

  // ---------- Other Inbox actions ----------
  const cooley = (await threads('?q=cooley')).find(t => t.head.type === 'bill_due');
  if (cooley) {
    const paid = await call('POST', `/api/events/${cooley.head.id}/action`, { action: 'pay' });
    check('pay a regular bill from the Inbox', paid.status === 200 && paid.body.follow_up?.type === 'payment_scheduled', paid.body.follow_up?.summary);
  }
  const target = (await threads('?priority=fyi'))[0];
  check('snooze needs a time', (await call('PATCH', `/api/events/${target.head.id}`, { status: 'snoozed' })).status === 400);
  await call('PATCH', `/api/events/${target.head.id}`, { status: 'snoozed', snooze_until: new Date(Date.now() + 3 * 3_600_000).toISOString(), apply_to_thread: true });
  check('snoozed thread leaves the inbox', !(await threads()).some(t => t.thread_id === target.thread_id));
  check('unknown id is a 404', (await call('PATCH', '/api/events/not-a-real-id', { status: 'read' })).status === 404);
  const inv = await call('POST', '/api/simulate', { scenario: 'invoice_progress' });
  check('advance an invoice thread', inv.status === 201, inv.body.event?.title);

  // ---------- Audit trail ----------
  const audit = (await call('GET', '/api/audit')).body.entries as { event: string }[];
  const events = new Set(audit.map(a => a.event));
  const expected = ['card_suggested', 'decision_refused', 'decision_approved', 'transfer_executed', 'decision_wrong', 'dispute_submitted'];
  check('audit log has every suggestion and decision', expected.every(e => events.has(e)), expected.filter(e => !events.has(e)).join(', ') || `${audit.length} entries`);

  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
  process.exit(failures ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
