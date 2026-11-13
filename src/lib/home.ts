import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAccounts } from './checkin/store';
import type { Account } from './checkin/types';
import { buildThreads } from './threads';
import type { InboxEvent } from './types';

const DAY = 86_400_000;
export const CARD_LIMIT = 100_000;   // demo credit limit for Loop Labs' cards

export type Flow = { name: string; amount: number };

export type HomeData = {
  accounts: Account[];
  total: number;
  series: { date: string; balance: number }[];   // end-of-day total cash, last 30 days
  last30: { inflows: number; outflows: number };
  month: { label: string; outflows: number; topOutflows: Flow[]; inflows: number; topInflows: Flow[] };
  credit: { balance: number; limit: number };
  invoicesUnpaid: number;
};

type Txn = { vendor: string; amount: number; occurred_at: string };

/**
 * Everything the Home dashboard shows, derived from the same demo data Check-in reads: the balance line
 * is today's cash walked backwards through the money that moved since.
 */
export async function loadHome(db: SupabaseClient, now: Date = new Date()): Promise<HomeData> {
  const since = new Date(now.getTime() - 35 * DAY).toISOString();
  const [accounts, txRes, evRes] = await Promise.all([
    loadAccounts(db),
    db.from('transactions').select('vendor, amount, method, occurred_at').gte('occurred_at', since),
    db.from('inbox_events').select('*').eq('source', 'invoicing'),
  ]);
  if (txRes.error) throw new Error(txRes.error.message);
  if (evRes.error) throw new Error(evRes.error.message);

  const outflows: Txn[] = (txRes.data ?? []).map(t => ({ vendor: t.vendor, amount: Number(t.amount), occurred_at: t.occurred_at }));
  const invoiceEvents = (evRes.data ?? []).map(e => ({ ...e, amount: e.amount == null ? null : Number(e.amount) })) as InboxEvent[];
  const inflows: Txn[] = invoiceEvents
    .filter(e => e.type === 'invoice_deposited' && e.amount != null)
    .map(e => ({ vendor: e.counterparty ?? 'Customer', amount: e.amount!, occurred_at: e.created_at }));

  const total = round2(accounts.reduce((t, a) => t + a.balance, 0));
  const endOfDay = (offset: number) => {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d.getTime() - offset * DAY;
  };

  // Balance at the end of each day = today's balance + what went out since − what came in since.
  const series = Array.from({ length: 30 }, (_, i) => {
    const offset = 29 - i;
    const cutoff = offset === 0 ? now.getTime() : endOfDay(offset);
    const outAfter = sumAfter(outflows, cutoff, now);
    const inAfter = sumAfter(inflows, cutoff, now);
    return { date: isoDay(new Date(cutoff)), balance: round2(total + outAfter - inAfter) };
  });

  const from30 = now.getTime() - 30 * DAY;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const inMonth = (t: Txn) => Date.parse(t.occurred_at) >= monthStart;
  const cardThisMonth = (txRes.data ?? []).filter(t => t.method === 'card' && Date.parse(t.occurred_at) >= monthStart);

  const unpaid = buildThreads(invoiceEvents, now)
    .filter(t => t.status !== 'done' && (t.head.type === 'invoice_sent' || t.head.type === 'invoice_viewed'))
    .reduce((s, t) => s + (t.head.amount ?? 0), 0);

  return {
    accounts,
    total,
    series,
    last30: {
      inflows: round2(sum(inflows.filter(t => Date.parse(t.occurred_at) >= from30).map(t => t.amount))),
      outflows: round2(sum(outflows.filter(t => Date.parse(t.occurred_at) >= from30).map(t => t.amount))),
    },
    month: {
      label: now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      outflows: round2(sum(outflows.filter(inMonth).map(t => t.amount))),
      topOutflows: top(outflows.filter(inMonth)),
      inflows: round2(sum(inflows.filter(inMonth).map(t => t.amount))),
      topInflows: top(inflows.filter(inMonth)),
    },
    credit: { balance: round2(sum(cardThisMonth.map(t => Number(t.amount)))), limit: CARD_LIMIT },
    invoicesUnpaid: round2(unpaid),
  };
}

function sumAfter(xs: Txn[], cutoff: number, now: Date) {
  return sum(xs.filter(t => { const at = Date.parse(t.occurred_at); return at > cutoff && at <= now.getTime(); }).map(t => t.amount));
}

function top(xs: Txn[], n = 5): Flow[] {
  const by = new Map<string, number>();
  for (const t of xs) by.set(t.vendor, (by.get(t.vendor) ?? 0) + t.amount);
  return [...by].map(([name, amount]) => ({ name, amount: round2(amount) })).sort((a, b) => b.amount - a.amount).slice(0, n);
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
