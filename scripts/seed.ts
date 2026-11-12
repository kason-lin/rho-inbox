/**
 * Resets the demo to Loop Labs' Monday morning: a seed-stage company with 6 people
 * (numbers from the Check-in spec). Writes the data Check-in reads, an Inbox history that matches it,
 * then runs the Check-in engine, which adds the 3 cards to both Check-in and the Inbox.
 * Run: npm run seed
 */
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { followUpFor } from '../src/lib/actions';
import { buildLoopLabs } from '../src/lib/checkin/demo-data';
import { runCheckin } from '../src/lib/checkin/store';
import { formatUSD } from '../src/lib/format';
import { classify } from '../src/lib/priority';
import { advanceInvoice } from '../src/lib/simulator';
import type { InboxEvent, NewEvent, Status } from '../src/lib/types';

config({ path: '.env.local', quiet: true });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');

const now = new Date();
const data = buildLoopLabs(now);
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();

// ---------- Inbox history ----------
const rows: InboxEvent[] = [];

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
    created_at: opts.hoursAgo < 0 ? now.toISOString() : hoursAgo(opts.hoursAgo),
  };
  rows.push(row);
  return row;
}

function invoiceThread(customer: string, amount: number, number: string, sentDaysAgo: number, stages: { hoursAgo: number; status: Status }[]) {
  let last = add({
    source: 'invoicing', type: 'invoice_sent',
    title: `Invoice ${number} sent to ${customer}`,
    summary: `${formatUSD(amount)} · payable by ACH, wire or card`,
    amount, counterparty: customer, action_type: null,
    due_at: daysFromNow(30 - sentDaysAgo), meta: { invoice_number: number },
  }, stages[0]);
  for (const s of stages.slice(1)) {
    const next = advanceInvoice(last);
    if (!next) break;
    last = add(next, { ...s, thread: last.thread_id });
  }
}

function bill(vendor: string, amount: number, dueInDays: number, invoice: string): NewEvent {
  return {
    source: 'bill_pay', type: 'bill_due',
    title: `${vendor} bill for ${formatUSD(amount)}`,
    summary: `Invoice ${invoice} · scanned from billing@ email · terms Net 30`,
    amount, counterparty: vendor, action_type: 'pay', due_at: daysFromNow(dueInDays), meta: {},
  };
}

// Customers paying Loop Labs
invoiceThread('Northwind Logistics', 6000, '#1042', 6, [
  { hoursAgo: 6 * 24, status: 'read' }, { hoursAgo: 5 * 24, status: 'read' },
  { hoursAgo: 2 * 24, status: 'read' }, { hoursAgo: 20, status: 'unread' },
]);
invoiceThread('Halcyon Health', 4500, '#1051', 1, [{ hoursAgo: 26, status: 'read' }, { hoursAgo: 3, status: 'unread' }]);
invoiceThread('Lumen Analytics', 3200, '#1039', 12, [
  { hoursAgo: 12 * 24, status: 'done' }, { hoursAgo: 11 * 24, status: 'done' },
  { hoursAgo: 9 * 24, status: 'done' }, { hoursAgo: 8 * 24, status: 'done' },
]);

// Bills: the two scheduled ones (not urgent yet), and one already paid
add(bill('Cooley LLP', 3850, 18, 'CL-2219'), { hoursAgo: 28, status: 'read' });
add(bill('WeWork', 4800, 19, 'WW-20931'), { hoursAgo: 3 * 24, status: 'read' });
const pilot = add(bill('Pilot (bookkeeping)', 890, -1, 'PB-7731'), { hoursAgo: 4 * 24, status: 'done' });
add(followUpFor(pilot, 'pay', new Date(hoursAgo(4 * 24 - 1))), { hoursAgo: 4 * 24 - 1, status: 'read', thread: pilot.thread_id });

// Card spend from the last 7 days, straight from the transactions Check-in reads
const week = data.transactions
  .filter(t => t.method === 'card' && Date.parse(t.occurred_at) >= now.getTime() - 7 * 86_400_000)
  .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
week.forEach((t, i) => add({
  source: 'cards', type: 'card_charge',
  title: `${t.card_owner} spent ${formatUSD(t.amount)} at ${t.vendor}`,
  summary: `${t.category} · Rho Platinum ••${t.card_last4}`,
  amount: t.amount, counterparty: t.vendor, action_type: 'dispute', due_at: null,
  meta: { cardholder: t.card_owner ?? undefined, category: t.category, typical_amount: 1_000 },
}, { hoursAgo: (now.getTime() - Date.parse(t.occurred_at)) / 3_600_000, status: i < 3 ? 'unread' : 'read' }));

// Treasury and approvals
add({
  source: 'treasury', type: 'yield_credited', title: `Treasury earned ${formatUSD(893.12)} this week`,
  summary: 'Net yield credited to Treasury ••7310', amount: 893.12, counterparty: 'Treasury ••7310',
  action_type: null, due_at: null, meta: {},
}, { hoursAgo: 2 * 24, status: 'read' });
for (const [title, amount, h] of [
  ["Jordan Ellis approved Sam Rivera's expense reimbursement", 64.3, 30],
  ["You approved Priya Shah's conference travel", 1284.6, 6 * 24],
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
  const wipe = async (table: string, column = 'created_at') => {
    const { error } = await db.from(table).delete().not(column, 'is', null);
    if (error) throw new Error(`Clearing ${table}: ${error.message}`);
  };
  const put = async (table: string, values: unknown[]) => {
    const { error } = await db.from(table).insert(values);
    if (error) throw new Error(`Seeding ${table}: ${error.message}`);
  };

  // Children before parents.
  await wipe('audit_log');
  await wipe('checkin_feedback');
  await wipe('checkin_cards');
  await wipe('inbox_events');
  await wipe('transactions', 'id');
  await wipe('scheduled_payments', 'id');
  await wipe('vendor_usage', 'vendor');
  await wipe('burn_months', 'month');
  await wipe('known_changes', 'id');
  await wipe('accounts', 'id');
  await wipe('app_users', 'id');

  await put('app_users', data.users);
  await put('accounts', data.accounts);
  await put('scheduled_payments', data.scheduled);
  await put('transactions', data.transactions);
  await put('vendor_usage', data.usage);
  await put('burn_months', data.burn);
  await put('known_changes', data.changes);
  await put('inbox_events', rows);

  const briefing = await runCheckin(db, now);
  console.log(`Seeded Loop Labs: ${rows.length} inbox events, ${data.transactions.length} transactions.`);
  console.log(`Check-in: ${briefing.cards.length} things need you`);
  briefing.cards.forEach(c => console.log(`  ${c.rank}. ${c.title}${c.question ? ` ${c.question}` : ''}`));
  console.log(`  + ${briefing.others.length} other things look fine`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
