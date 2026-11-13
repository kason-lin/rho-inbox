import { formatUSD } from './format';
import type { InboxEvent, NewEvent, Source } from './types';

export type Rng = () => number;

/** Small seedable RNG so the seed script and tests are repeatable. */
export function mulberry32(seed: number): Rng {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T,>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cents = (rng: Rng, min: number, max: number) => Math.round((min + rng() * (max - min)) * 100) / 100;
const daysFrom = (now: Date, days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();

export const CARDHOLDERS = [
  { name: 'Kason Lin', typical: 180 },
  { name: 'Jordan Ellis', typical: 140 },
  { name: 'Ana Costa', typical: 120 },
  { name: 'Priya Shah', typical: 90 },
  { name: 'Sam Rivera', typical: 60 },
  { name: 'Leo Martins', typical: 75 },
] as const;

const CARD_MERCHANTS = [
  { name: 'Figma', category: 'Software' },
  { name: 'Notion', category: 'Software' },
  { name: 'Uber', category: 'Travel' },
  { name: 'Delta Air Lines', category: 'Travel' },
  { name: 'Sweetgreen', category: 'Meals' },
  { name: 'DoorDash', category: 'Meals' },
  { name: 'Amazon Business', category: 'Office supplies' },
  { name: 'Linear', category: 'Software' },
  { name: 'Datadog', category: 'Software' },
] as const;

const BILL_VENDORS = [
  { name: 'Cooley LLP', min: 2400, max: 5200 },
  { name: 'WeWork', min: 4200, max: 5400 },
  { name: 'Carta', min: 800, max: 1600 },
  { name: 'Pilot (bookkeeping)', min: 650, max: 1200 },
  { name: 'Embroker', min: 900, max: 2100 },
] as const;

export const CUSTOMERS = [
  'Northwind Logistics', 'Halcyon Health', 'Parcel & Co', 'Lumen Analytics', 'Orbit Studios',
] as const;

const APPROVAL_KINDS = [
  { what: 'Expense reimbursement', min: 48, max: 640 },
  { what: 'Card limit increase', min: 1000, max: 5000 },
  { what: 'New vendor: Retool', min: 1200, max: 1200 },
  { what: 'Bill over $3,000', min: 3000, max: 6000 },
] as const;

export const SCENARIOS = [
  'card_charge', 'unusual_charge', 'bill_due_soon', 'invoice_progress',
  'treasury_update', 'low_cash', 'approval_request',
] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const SCENARIO_SOURCE: Record<Scenario, Source> = {
  card_charge: 'cards',
  unusual_charge: 'cards',
  bill_due_soon: 'bill_pay',
  invoice_progress: 'invoicing',
  treasury_update: 'treasury',
  low_cash: 'treasury',
  approval_request: 'approvals',
};

// ---------- One generator per source ----------

export function cardCharge(rng: Rng, opts: { unusual?: boolean } = {}): NewEvent {
  const holder = pick(rng, CARDHOLDERS);
  const merchant = opts.unusual
    ? pick(rng, [{ name: 'Apple Store', category: 'Electronics' }, { name: 'Marriott', category: 'Lodging' }])
    : pick(rng, CARD_MERCHANTS);
  const amount = opts.unusual
    ? cents(rng, holder.typical * 8, holder.typical * 14)
    : cents(rng, holder.typical * 0.3, holder.typical * 1.6);
  return {
    source: 'cards',
    type: 'card_charge',
    title: `${holder.name} spent ${formatUSD(amount)} at ${merchant.name}`,
    summary: `${merchant.category} · Rho Platinum ••${String(1000 + Math.floor(rng() * 9000))}`,
    amount,
    counterparty: merchant.name,
    action_type: 'dispute',
    due_at: null,
    meta: { cardholder: holder.name, category: merchant.category, typical_amount: holder.typical },
  };
}

export function billDue(rng: Rng, now: Date, opts: { dueInDays?: number } = {}): NewEvent {
  const vendor = pick(rng, BILL_VENDORS);
  const amount = cents(rng, vendor.min, vendor.max);
  const dueIn = opts.dueInDays ?? 1 + Math.floor(rng() * 9);
  return {
    source: 'bill_pay',
    type: 'bill_due',
    title: `${vendor.name} bill for ${formatUSD(amount)}`,
    summary: `Invoice ${invoiceNo(rng, 'INV')} · scanned from billing@ email · terms Net 30`,
    amount,
    counterparty: vendor.name,
    action_type: 'pay',
    due_at: daysFrom(now, dueIn),
    meta: {},
  };
}

const INVOICE_STAGES = ['invoice_sent', 'invoice_viewed', 'invoice_paid', 'invoice_deposited'] as const;

export function invoiceSent(rng: Rng, now: Date, opts: { dueInDays?: number } = {}): NewEvent {
  const customer = pick(rng, CUSTOMERS);
  const amount = cents(rng, 2400, 24000);
  const number = invoiceNo(rng, '#');
  return {
    source: 'invoicing',
    type: 'invoice_sent',
    title: `Invoice ${number} sent to ${customer}`,
    summary: `${formatUSD(amount)} · payable by ACH, wire or card`,
    amount,
    counterparty: customer,
    action_type: null,
    due_at: daysFrom(now, opts.dueInDays ?? 30),
    meta: { invoice_number: number },
  };
}

/** Next step in an invoice's life, or null when it's already deposited. */
export function advanceInvoice(last: Pick<InboxEvent, 'type' | 'amount' | 'counterparty' | 'thread_id' | 'due_at' | 'meta'>): NewEvent | null {
  const i = INVOICE_STAGES.indexOf(last.type as (typeof INVOICE_STAGES)[number]);
  if (i < 0 || i === INVOICE_STAGES.length - 1) return null;
  const next = INVOICE_STAGES[i + 1];
  const number = last.meta.invoice_number ?? '';
  const copy = {
    invoice_viewed: [`${last.counterparty} viewed invoice ${number}`, 'Opened from the emailed payment link'],
    invoice_paid: [`${last.counterparty} paid invoice ${number}`, `${formatUSD(last.amount)} by ACH. Funds settle next business day.`],
    invoice_deposited: [`${formatUSD(last.amount)} deposited from ${last.counterparty}`, 'Landed in Operating ••4821'],
  }[next as Exclude<typeof next, 'invoice_sent'>];
  return {
    source: 'invoicing',
    type: next,
    title: copy[0],
    summary: copy[1],
    amount: last.amount,
    counterparty: last.counterparty,
    thread_id: last.thread_id,
    action_type: null,
    due_at: next === 'invoice_viewed' ? last.due_at : null,
    meta: { invoice_number: number },
  };
}

export function treasuryUpdate(rng: Rng, opts: { lowCash?: boolean } = {}): NewEvent {
  if (opts.lowCash) {
    const burn = cents(rng, 90000, 100000);
    const balance = cents(rng, burn * 1.1, burn * 1.6);
    return {
      source: 'treasury',
      type: 'low_balance',
      title: 'Operating cash is running low',
      summary: `Operating ••4821 holds ${formatUSD(balance)} against ${formatUSD(burn)} monthly burn. Treasury has funds to move.`,
      amount: balance,
      counterparty: 'Operating ••4821',
      action_type: null,
      due_at: null,
      meta: { balance, monthly_burn: burn },
    };
  }
  const yieldAmt = cents(rng, 820, 960);   // ~4.4% on ~$1M in Treasury, weekly
  return {
    source: 'treasury',
    type: 'yield_credited',
    title: `Treasury earned ${formatUSD(yieldAmt)} this week`,
    summary: 'Net yield credited to Treasury ••7310',
    amount: yieldAmt,
    counterparty: 'Treasury ••7310',
    action_type: null,
    due_at: null,
    meta: {},
  };
}

export function approvalRequest(rng: Rng): NewEvent {
  const kind = pick(rng, APPROVAL_KINDS);
  const requester = pick(rng, CARDHOLDERS).name;
  const amount = cents(rng, kind.min, kind.max);
  return {
    source: 'approvals',
    type: 'approval_requested',
    title: `${kind.what} from ${requester}`,
    summary: `${formatUSD(amount)} · policy requires a finance approver`,
    amount,
    counterparty: requester,
    action_type: 'approve',
    due_at: null,
    meta: { requested_by: requester },
  };
}

/** Build one event for a scenario. Invoice progress needs the thread it continues, if any. */
export function simulate(scenario: Scenario, rng: Rng, now: Date, lastInvoice?: InboxEvent | null): NewEvent {
  switch (scenario) {
    case 'card_charge': return cardCharge(rng);
    case 'unusual_charge': return cardCharge(rng, { unusual: true });
    case 'bill_due_soon': return billDue(rng, now, { dueInDays: 1 + Math.floor(rng() * 2) });
    case 'invoice_progress': return (lastInvoice && advanceInvoice(lastInvoice)) || invoiceSent(rng, now);
    case 'treasury_update': return treasuryUpdate(rng);
    case 'low_cash': return treasuryUpdate(rng, { lowCash: true });
    case 'approval_request': return approvalRequest(rng);
  }
}

/** Default scenario when the caller only names a source. */
export function scenarioFor(source: Source, rng: Rng): Scenario {
  const options = (Object.keys(SCENARIO_SOURCE) as Scenario[]).filter(s => SCENARIO_SOURCE[s] === source);
  return pick(rng, options);
}

function invoiceNo(rng: Rng, prefix: string) {
  return `${prefix}${1000 + Math.floor(rng() * 9000)}`;
}
