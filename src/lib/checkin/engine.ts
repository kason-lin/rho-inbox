import { formatUSD, formatUSDShort, oneDecimal, shortDate } from '../format';
import type {
  Account, Briefing, CardDraft, CardType, Feedback, ProofItem, RankedCard, Snapshot, Txn,
} from './types';
import { PAYROLL_CATEGORIES } from './types';

const DAY = 86_400_000;
export const BASE_THRESHOLD_DAYS = 3;   // Step C: show non-urgent cards worth 3+ days of runway
export const UNUSED_DAYS = 60;
export const MAX_CARDS = 3;             // Step D
const BURN_CHANGE = 0.1;
const DUPLICATE_WINDOW_DAYS = 14;
const PRICE_INCREASE = 0.1;
const BUFFER = 0.1;                     // transfer = shortfall + 10%, rounded up to $1,000

type Ctx = {
  s: Snapshot;
  now: Date;
  checking: Account;
  treasury: Account;
  totalCash: number;
  burnAverage: number;
  burnProjected: number;
  fine: string[];                       // "looks fine" lines, one per check that passed
};

/** Run every detector, then rank and filter (spec steps A–E). Pure: same snapshot, same briefing. */
export function runEngine(s: Snapshot): Briefing {
  const checking = account(s, 'checking');
  const treasury = account(s, 'treasury');
  const months = [...s.burn].sort((a, b) => a.month.localeCompare(b.month)).slice(-3);
  const burnAverage = round2(months.reduce((t, m) => t + m.total, 0) / Math.max(months.length, 1));
  const last = months[months.length - 1]?.total ?? burnAverage;
  const ctx: Ctx = {
    s, now: s.now, checking, treasury,
    totalCash: round2(checking.balance + treasury.balance),
    burnAverage,
    burnProjected: round2(last + s.changes.reduce((t, c) => t + c.monthly_delta, 0)),
    fine: [],
  };

  const candidates = [
    ...paydayGuard(ctx),
    ...suspiciousCharges(ctx),
    ...subscriptionReviews(ctx),
    ...burnChange(ctx),
  ];
  generalChecks(ctx);

  const perDay = burnAverage / 30;
  const scored = candidates
    .filter(c => !isMuted(c, s.feedback) && !isDecided(c, s))
    .map(c => ({ ...c, runway_days: c.urgent ? null : round2(c.monthly_impact / perDay) }));

  const others = [...ctx.fine];
  const qualifying: CardDraft[] = [];
  for (const c of scored) {
    const bar = thresholdFor(c.type, s.feedback);
    // Step C, plus Kason's exception: spend on a tool nobody uses always qualifies.
    if (c.urgent || c.rule === 'unused_60_days' || (c.runway_days ?? 0) >= bar) qualifying.push(c);
    else others.push(`${c.title} (under ${bar} days of runway, so not a card this week)`);
  }

  // Step A: urgent first. Step B: then by runway impact, cards with a decision ahead of FYI-only cards.
  qualifying.sort((a, b) =>
    Number(b.urgent) - Number(a.urgent) ||
    (a.urgent ? b.monthly_impact - a.monthly_impact : 0) ||
    Number(isDecision(b)) - Number(isDecision(a)) ||
    (b.runway_days ?? 0) - (a.runway_days ?? 0),
  );

  const cards: RankedCard[] = qualifying.slice(0, MAX_CARDS).map((c, i) => ({ ...c, rank: i + 1 }));
  for (const c of qualifying.slice(MAX_CARDS)) others.push(`${c.title} (lower priority this week)`);

  return {
    cards,
    others,
    burn: { average: burnAverage, projected: ctx.burnProjected, per_day: round2(perDay) },
    runway_months: round2(ctx.totalCash / burnAverage),
    total_cash: ctx.totalCash,
    data_as_of: [checking.updated_at, treasury.updated_at].sort()[0],
  };
}

// ---------- Step E: feedback ----------

/** Two "Not now" taps on a card type double its bar (again for every further two). */
export function thresholdFor(type: CardType, feedback: Feedback[]): number {
  const notNow = feedback.filter(f => f.card_type === type && f.kind === 'not_now').length;
  return BASE_THRESHOLD_DAYS * 2 ** Math.floor(notNow / 2);
}

/** "This is wrong" mutes that rule for that vendor. */
function isMuted(c: CardDraft, feedback: Feedback[]) {
  return feedback.some(f => f.kind === 'wrong' && f.card_type === c.type && f.rule === c.rule && (f.vendor ?? null) === c.vendor);
}

function isDecided(c: CardDraft, s: Snapshot) {
  return s.decided.some(d => d.type === c.type && d.rule === c.rule && (d.vendor ?? null) === c.vendor);
}

const isDecision = (c: CardDraft) => !!c.action && c.action.kind !== 'share';

// ---------- Payday guard (urgent) ----------

function paydayGuard(x: Ctx): CardDraft[] {
  const today = startOfDay(x.now);
  const horizon = today + 7 * DAY;
  const due = x.s.scheduled
    .filter(p => p.account_id === 'checking' && dayOf(p.due_on) >= today && dayOf(p.due_on) <= horizon)
    .sort((a, b) => a.due_on.localeCompare(b.due_on));
  const total = round2(sum(due.map(p => p.amount)));

  if (total <= x.checking.balance) {
    x.fine.push(due.length ? `Checking covers the ${formatUSD(total)} due in the next 7 days` : 'Nothing is due from checking in the next 7 days');
    return [];
  }
  const shortfall = round2(total - x.checking.balance);
  if (x.treasury.balance < shortfall) return [];   // the spec only covers gaps Treasury can fill

  const move = Math.ceil((shortfall * (1 + BUFFER)) / 1000) * 1000;
  const payroll = due.find(p => p.kind === 'payroll');
  const when = payroll ? `Payroll ${weekday(payroll.due_on)}` : 'Bills this week';
  const todayIso = isoDay(x.now);

  return [{
    key: 'payday_guard|shortfall_7d|',
    type: 'payday_guard',
    rule: 'shortfall_7d',
    vendor: null,
    urgent: true,
    monthly_impact: shortfall,
    runway_days: null,
    title: `${when}: checking is ${formatUSDShort(shortfall)} short.`,
    question: `Move ${formatUSDShort(move)} from treasury?`,
    why: `Bills and payroll due from checking in the next 7 days add up to ${formatUSD(total)}, but checking holds ${formatUSD(x.checking.balance)}. ` +
      `Treasury has ${formatUSD(x.treasury.balance)}, so it can cover the gap. We suggest the shortfall plus a 10% buffer, rounded up to the next $1,000.`,
    proof: [
      {
        title: 'Due from checking in the next 7 days',
        items: due.map(p => ({ label: p.payee, detail: p.kind === 'payroll' ? 'Payroll' : 'Bill', date: p.due_on, amount: p.amount, payroll: p.kind === 'payroll' })),
      },
      {
        title: 'Balances',
        items: [
          { label: `${x.checking.name} ••${x.checking.last4}`, amount: x.checking.balance },
          { label: `${x.treasury.name} ••${x.treasury.last4}`, amount: x.treasury.balance },
          { label: 'Shortfall', amount: -shortfall, emphasis: true },
        ],
      },
      {
        title: 'After the transfer',
        items: [
          { label: `${x.checking.name} ••${x.checking.last4}`, amount: round2(x.checking.balance + move) },
          { label: `${x.treasury.name} ••${x.treasury.last4}`, amount: round2(x.treasury.balance - move) },
        ],
      },
    ],
    action: { kind: 'transfer', from: 'treasury', to: 'checking', amount: move, date: todayIso, label: `Move ${formatUSDShort(move)} to checking` },
  }];
}

// ---------- Suspicious charge (urgent) ----------

function suspiciousCharges(x: Ctx): CardDraft[] {
  const since = x.now.getTime() - DUPLICATE_WINDOW_DAYS * DAY;
  const card = x.s.transactions.filter(t => t.method === 'card');
  const recent = card.filter(t => time(t) >= since);
  const out: CardDraft[] = [];

  // Same vendor and amount, twice within 14 days.
  const groups = groupBy(recent, t => `${t.vendor}|${t.amount.toFixed(2)}`);
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    const [first, second] = list.sort((a, b) => time(a) - time(b)).slice(-2);
    const days = Math.max(1, Math.round((time(second) - time(first)) / DAY));
    const history = card.filter(t => t.vendor === second.vendor && time(t) < time(first));
    out.push({
      key: `suspicious_charge|duplicate_14d|${second.vendor}`,
      type: 'suspicious_charge',
      rule: 'duplicate_14d',
      vendor: second.vendor,
      urgent: true,
      monthly_impact: second.amount,
      runway_days: null,
      title: `${second.vendor} charged ${formatUSDShort(second.amount)} twice in ${days} days.`,
      question: 'Dispute the second charge?',
      why: `The same vendor billed the same amount twice within ${DUPLICATE_WINDOW_DAYS} days. That's usually a billing error or a duplicate subscription.`,
      proof: [
        { title: 'Side by side', items: [first, second].map(txnItem) },
        {
          title: `${second.vendor} history (90 days)`,
          items: history.length ? history.map(txnItem) : [{ label: 'No earlier charges from this vendor' }],
        },
      ],
      action: {
        kind: 'dispute', vendor: second.vendor, amount: second.amount, transaction_id: second.id,
        card_last4: second.card_last4, reason: 'Duplicate charge: the same amount was billed twice', label: 'Review dispute',
      },
    });
  }

  // A new vendor with an unusual amount.
  const median = medianOf(card.map(t => t.amount));
  for (const [vendor, list] of groupBy(card, t => t.vendor)) {
    const firstSeen = Math.min(...list.map(time));
    const big = list.filter(t => time(t) >= since && t.amount > Math.max(500, median * 3));
    if (firstSeen < since || !big.length || out.some(c => c.vendor === vendor)) continue;
    const t = big[big.length - 1];
    out.push({
      key: `suspicious_charge|new_vendor_unusual|${vendor}`,
      type: 'suspicious_charge',
      rule: 'new_vendor_unusual',
      vendor,
      urgent: true,
      monthly_impact: t.amount,
      runway_days: null,
      title: `New vendor ${vendor} charged ${formatUSDShort(t.amount)}.`,
      question: 'Dispute this charge?',
      why: `${vendor} is new in the last ${DUPLICATE_WINDOW_DAYS} days, and ${formatUSD(t.amount)} is far above your typical card charge (${formatUSD(median)}).`,
      proof: [{ title: 'The charge', items: [txnItem(t)] }, { title: 'Typical card charge (90-day median)', items: [{ label: 'Median', amount: median }] }],
      action: { kind: 'dispute', vendor, amount: t.amount, transaction_id: t.id, card_last4: t.card_last4, reason: 'Unrecognized charge', label: 'Review dispute' },
    });
  }

  if (!out.length) x.fine.push(`No duplicate or unusual card charges in the last ${DUPLICATE_WINDOW_DAYS} days`);
  return out;
}

// ---------- Subscription review (by cost) ----------

function subscriptionReviews(x: Ctx): CardDraft[] {
  const out: CardDraft[] = [];
  const recurring = x.s.transactions.filter(t => t.method === 'card' && t.recurring);

  for (const [vendor, list] of groupBy(recurring, t => t.vendor)) {
    list.sort((a, b) => time(a) - time(b));
    const latest = list[list.length - 1];
    const prev = list[list.length - 2];
    const usage = x.s.usage.find(u => u.vendor === vendor);
    if (usage?.locked) continue;

    const price = latest.amount;
    const yearly = round2(price * 12);
    const idle = usage ? (usage.last_login_at ? Math.floor((x.now.getTime() - Date.parse(usage.last_login_at)) / DAY) : Infinity) : null;
    const history: ProofItem[] = list.slice(-3).reverse().map(txnItem);
    const lock = {
      kind: 'lock_card' as const, vendor, card_last4: latest.card_last4, card_owner: latest.card_owner,
      monthly_cost: price, label: `Lock card ••${latest.card_last4}`,
    };
    const base = {
      type: 'subscription_review' as const, vendor, urgent: false, runway_days: null,
      question: 'Cancel it?', action: lock,
    };

    if (idle !== null && idle >= UNUSED_DAYS) {
      const days = Number.isFinite(idle) ? idle : UNUSED_DAYS;
      out.push({
        ...base,
        key: `subscription_review|unused_60_days|${vendor}`,
        rule: 'unused_60_days',
        monthly_impact: price,
        title: `${formatUSDShort(price)}/mo ${vendor} plan, unused ${days} days.`,
        why: `Nobody has signed in to ${vendor} for ${days} days (from your Google Workspace connection), but it still charges ` +
          `${formatUSD(price)} a month to ${latest.card_owner}'s card. That's ${formatUSD(yearly)} a year. Unused tools always make the list, even when they're small.`,
        proof: [
          { title: 'Charge history', items: history },
          {
            title: 'Card and usage',
            items: [
              { label: 'Card', detail: `Virtual card ••${latest.card_last4} · ${latest.card_owner}` },
              { label: 'Last sign-in', detail: usage?.last_login_at ? shortDate(usage.last_login_at) : 'Never' },
              { label: 'Cost per year', amount: yearly, emphasis: true },
            ],
          },
        ],
      });
    } else if (usage && !usage.card_owner_active) {
      out.push({
        ...base,
        key: `subscription_review|owner_left|${vendor}`,
        rule: 'owner_left',
        monthly_impact: price,
        title: `${vendor} runs on a card owned by someone who left.`,
        why: `${latest.card_owner} is no longer an active teammate, but their card still pays ${formatUSD(price)} a month to ${vendor}.`,
        proof: [{ title: 'Charge history', items: history }, { title: 'Cost per year', items: [{ label: 'Total', amount: yearly }] }],
      });
    } else if (prev && price > prev.amount * (1 + PRICE_INCREASE)) {
      const delta = round2(price - prev.amount);
      out.push({
        ...base,
        key: `subscription_review|price_increase|${vendor}`,
        rule: 'price_increase',
        monthly_impact: delta,
        title: `${vendor} went up ${formatUSDShort(delta)}/mo.`,
        why: `${vendor} charged ${formatUSD(price)} this month, up from ${formatUSD(prev.amount)}. We flag recurring increases over 10%.`,
        proof: [{ title: 'Charge history', items: history }, { title: 'Extra cost per year', items: [{ label: 'Total', amount: round2(delta * 12) }] }],
      });
    } else if (!usage && Math.min(...list.map(time)) >= x.now.getTime() - 30 * DAY) {
      out.push({
        ...base,
        key: `subscription_review|unfamiliar_vendor|${vendor}`,
        rule: 'unfamiliar_vendor',
        monthly_impact: price,
        title: `New recurring charge from ${vendor}.`,
        why: `${vendor} started billing ${formatUSD(price)} a month recently, and nobody on the team has an account we can see.`,
        proof: [{ title: 'Charge history', items: history }],
      });
    } else {
      x.fine.push(`${vendor} (${formatUSD(price)}/mo): ${idle !== null ? `used ${idle === 0 ? 'today' : `${idle}d ago`}, ` : ''}price steady`);
    }
  }
  return out;
}

// ---------- Burn change (by cost, no money action) ----------

function burnChange(x: Ctx): CardDraft[] {
  const { burnAverage: avg, burnProjected: projected } = x;
  const change = (projected - avg) / avg;
  const before = x.totalCash / avg;
  const after = x.totalCash / projected;
  if (Math.abs(change) < BURN_CHANGE) {
    x.fine.push(`Burn is steady at ${formatUSD(avg)} a month (${oneDecimal(before)} months of runway)`);
    return [];
  }

  const months = [...x.s.burn].sort((a, b) => a.month.localeCompare(b.month)).slice(-3);
  const last = months[months.length - 1];
  // jsonb doesn't keep key order, so sort biggest first rather than trusting the stored order.
  const categories = Object.keys(last.by_category).sort((a, b) => (last.by_category[b] ?? 0) - (last.by_category[a] ?? 0));
  const avgFor = (c: string) => round2(sum(months.map(m => m.by_category[c] ?? 0)) / months.length);
  const projectedFor = (c: string) => round2((last.by_category[c] ?? 0) + sum(x.s.changes.filter(k => k.category === c).map(k => k.monthly_delta)));
  const pct = Math.round(Math.abs(change) * 100);
  const direction = change > 0 ? 'up' : 'down';

  return [{
    key: 'burn_change|burn_10pct|',
    type: 'burn_change',
    rule: 'burn_10pct',
    vendor: null,
    urgent: false,
    monthly_impact: round2(Math.abs(projected - avg)),
    runway_days: null,
    title: `Burn ${direction} ${pct}%: runway ${oneDecimal(before)} → ${oneDecimal(after)} months.`,
    question: null,
    why: `Projected monthly burn is ${formatUSD(projected)}, ${pct}% ${direction === 'up' ? 'above' : 'below'} your 3-month average of ${formatUSD(avg)}. ` +
      'We flag moves of 10% or more. The projection includes payroll and changes we already know about, like new hires and a raise found in a signed contract.',
    proof: [
      {
        title: 'By category (3-month average → projected)',
        items: categories.map(c => ({
          label: c, detail: `${formatUSD(avgFor(c))} → ${formatUSD(projectedFor(c))}`, amount: projectedFor(c),
          payroll: PAYROLL_CATEGORIES.includes(c),
        })),
      },
      {
        title: 'Top drivers',
        items: [...x.s.changes].sort((a, b) => b.monthly_delta - a.monthly_delta).map(k => ({
          label: k.description, detail: k.source === 'contract_email' ? 'Found in a signed contract (email)' : 'From payroll', amount: k.monthly_delta, payroll: k.payroll,
        })),
      },
      {
        title: 'Effect on runway',
        items: [
          { label: 'Total cash', amount: x.totalCash },
          { label: 'Runway today', detail: `${oneDecimal(before)} months` },
          { label: 'Runway at projected burn', detail: `${oneDecimal(after)} months`, emphasis: true },
        ],
      },
    ],
    action: { kind: 'share', to: x.s.cofounder, label: 'Share with co-founder' },
  }];
}

// ---------- Checks that only ever produce "looks fine" lines ----------

function generalChecks(x: Ctx) {
  const cards = new Set(x.s.transactions.filter(t => t.card_last4).map(t => t.card_last4));
  if (x.s.usage.every(u => u.card_owner_active)) x.fine.push(`All ${cards.size} cards belong to active teammates`);

  const today = startOfDay(x.now);
  const later = x.s.scheduled.filter(p => dayOf(p.due_on) > today + 7 * DAY && dayOf(p.due_on) <= today + 30 * DAY);
  const total = round2(sum(later.map(p => p.amount)));
  if (later.length && total <= x.totalCash) x.fine.push(`Bills and payroll due in 8–30 days (${formatUSD(total)}) are covered`);
}

// ---------- helpers ----------

function account(s: Snapshot, id: 'checking' | 'treasury'): Account {
  const a = s.accounts.find(x => x.id === id);
  if (!a) throw new Error(`Snapshot is missing the ${id} account`);
  return a;
}

function txnItem(t: Txn): ProofItem {
  return { label: t.vendor, detail: [t.card_last4 && `••${t.card_last4}`, t.card_owner].filter(Boolean).join(' · '), date: t.occurred_at, amount: t.amount };
}

function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
  return m;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const round2 = (n: number) => Math.round(n * 100) / 100;
const time = (t: Txn) => Date.parse(t.occurred_at);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayOf = (iso: string) => new Date(`${iso}T00:00:00`).getTime();
const weekday = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function medianOf(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return round2(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}
