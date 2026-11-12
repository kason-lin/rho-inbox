/**
 * Resets inbox_events to a realistic week for a finance lead at a ~50-person startup.
 * Three threads need action (a bill due tomorrow, an overdue invoice, a reimbursement);
 * everything else is FYI history. Run: npm run seed
 */
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { followUpFor } from '../src/lib/actions';
import { formatUSD } from '../src/lib/format';
import { classify } from '../src/lib/priority';
import { buildThreads, summarize } from '../src/lib/threads';
import { advanceInvoice, cardCharge, mulberry32, treasuryUpdate } from '../src/lib/simulator';
import type { InboxEvent, NewEvent, Status } from '../src/lib/types';

config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');

const now = new Date();
const rng = mulberry32(42);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

const rows: InboxEvent[] = [];

/** Add an event; returns it so threads can continue from it. */
function add(e: NewEvent, opts: { hoursAgo: number; status: Status; thread?: string }): InboxEvent {
  const { priority, reason } = classify(e, now);
  const row: InboxEvent = {
    ...e,
    id: randomUUID(),
    thread_id: opts.thread ?? e.thread_id ?? randomUUID(),
    status: opts.status,
    priority,
    snooze_until: null,
    meta: { ...e.meta, ...(reason ? { reason } : {}) },
    created_at: hoursAgo(opts.hoursAgo),
  };
  rows.push(row);
  return row;
}

function bill(vendor: string, amount: number, dueInDays: number, invoice: string): NewEvent {
  return {
    source: 'bill_pay', type: 'bill_due',
    title: `${vendor} bill for ${formatUSD(amount)}`,
    summary: `Invoice ${invoice} · scanned from billing@ email · terms Net 30`,
    amount, counterparty: vendor, action_type: 'pay', due_at: daysFromNow(dueInDays), meta: {},
  };
}

function invoice(customer: string, amount: number, number: string, sentDaysAgo: number): NewEvent {
  return {
    source: 'invoicing', type: 'invoice_sent',
    title: `Invoice ${number} sent to ${customer}`,
    summary: `${formatUSD(amount)} · payable by ACH, wire or card`,
    amount, counterparty: customer, action_type: null,
    due_at: daysFromNow(30 - sentDaysAgo), meta: { invoice_number: number },
  };
}

/** Walk an invoice thread forward through the given number of stages. */
function invoiceThread(start: NewEvent, stages: { hoursAgo: number; status: Status }[]) {
  let last = add(start, stages[0]);
  for (const s of stages.slice(1)) {
    const next = advanceInvoice(last);
    if (!next) break;
    last = add(next, { ...s, thread: last.thread_id });
  }
}

// ---------- Needs action ----------
add(bill('Amazon Web Services', 4212.5, 1, 'INV-88213'), { hoursAgo: 2, status: 'unread' });

invoiceThread(invoice('Acme Robotics', 7250, '#1047', 34), [
  { hoursAgo: 34 * 24, status: 'read' },
  { hoursAgo: 31 * 24, status: 'read' },
]);

add({
  source: 'approvals', type: 'approval_requested',
  title: 'Expense reimbursement from Marcus Webb',
  summary: `${formatUSD(386.2)} · client dinner at Nopa, receipt attached · policy requires a finance approver`,
  amount: 386.2, counterparty: 'Marcus Webb', action_type: 'approve', due_at: null,
  meta: { requested_by: 'Marcus Webb' },
}, { hoursAgo: 5, status: 'unread' });

// ---------- Invoices moving along ----------
invoiceThread(invoice('Northwind Logistics', 18400, '#1042', 6), [
  { hoursAgo: 6 * 24, status: 'read' },
  { hoursAgo: 5 * 24, status: 'read' },
  { hoursAgo: 2 * 24, status: 'read' },
  { hoursAgo: 20, status: 'unread' },
]);
invoiceThread(invoice('Halcyon Health', 12960, '#1051', 1), [
  { hoursAgo: 26, status: 'read' },
  { hoursAgo: 3, status: 'unread' },
]);
invoiceThread(invoice('Lumen Analytics', 5480, '#1039', 12), [
  { hoursAgo: 12 * 24, status: 'done' },
  { hoursAgo: 11 * 24, status: 'done' },
  { hoursAgo: 9 * 24, status: 'done' },
  { hoursAgo: 8 * 24, status: 'done' },
]);

// ---------- Bills: one coming up, two already paid ----------
add(bill('WeWork', 10250, 9, 'WW-20931'), { hoursAgo: 28, status: 'read' });
add(bill('Salesforce', 2961.4, 6, 'SF-554120'), { hoursAgo: 3 * 24, status: 'read' });
for (const [vendor, amount, inv, h] of [['Gusto', 1846.12, 'G-7731', 4 * 24], ['Cooley LLP', 6315, 'CL-2219', 6 * 24]] as const) {
  const due = add(bill(vendor, amount, -1, inv), { hoursAgo: h, status: 'done' });
  add(followUpFor(due, 'pay', new Date(hoursAgo(h - 1))), { hoursAgo: h - 1, status: 'read', thread: due.thread_id });
}

// ---------- Cards: a normal week, plus one charge that was disputed ----------
const cardHours = [1, 4, 7, 22, 27, 30, 49, 53, 70, 75, 98, 120, 143, 160];
cardHours.forEach((h, i) => add(cardCharge(rng), { hoursAgo: h, status: i < 3 ? 'unread' : 'read' }));

const flagged = add(cardCharge(rng, { unusual: true }), { hoursAgo: 3 * 24 + 4, status: 'done' });
add(followUpFor(flagged, 'dispute', new Date(hoursAgo(3 * 24 + 3))), { hoursAgo: 3 * 24 + 3, status: 'read', thread: flagged.thread_id });

// ---------- Treasury ----------
add(treasuryUpdate(rng), { hoursAgo: 2 * 24, status: 'read' });
add({
  source: 'treasury', type: 'sweep',
  title: `Swept ${formatUSD(250000)} from Operating to Treasury`,
  summary: 'Automatic sweep: Operating stays above your $600,000.00 floor',
  amount: 250000, counterparty: 'Treasury ••7310', action_type: null, due_at: null,
  meta: { balance: 1_204_880.12, monthly_burn: 412_000 },
}, { hoursAgo: 5 * 24, status: 'read' });

// ---------- Approvals others already handled ----------
for (const [title, amount, h] of [
  ["Theo Park approved Elena Ruiz's card limit increase", 5000, 30],
  ['Dana Okafor approved new vendor: Retool', 1200, 3 * 24],
  ["You approved Priya Shah's conference travel", 1874.36, 6 * 24],
] as const) {
  add({
    source: 'approvals', type: 'approval_granted', title,
    summary: `${formatUSD(amount)} · approved under the spend policy`,
    amount, counterparty: null, action_type: null, due_at: null, meta: {},
  }, { hoursAgo: h, status: 'read' });
}

// ---------- Write ----------
async function main() {
  const db = createClient(url!, key!, { auth: { persistSession: false } });
  const del = await db.from('inbox_events').delete().not('id', 'is', null);
  if (del.error) throw del.error;
  const ins = await db.from('inbox_events').insert(rows);
  if (ins.error) throw ins.error;

  const summary = summarize(buildThreads(rows, now));
  console.log(`Seeded ${rows.length} events in ${new Set(rows.map(r => r.thread_id)).size} threads.`);
  console.log(`${summary.needs_action} threads need action: ${summary.items.map(i => `${i.title} (${i.reason})`).join(' | ')}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
