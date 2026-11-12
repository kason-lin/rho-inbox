/**
 * Database side of Check-in. Takes a Supabase client instead of importing the server-only one,
 * so the seed script can use it too.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { classify } from '../priority';
import type { InboxEvent, NewEvent } from '../types';
import { CARD_SOURCE, planDecision } from './decide';
import { isoDay, runEngine } from './engine';
import type {
  Account, AppUser, Briefing, CardType, CheckinCard, Decision, Feedback, RankedCard, Snapshot,
} from './types';
import { viewCard, type CardView } from './view';

type Db = SupabaseClient;

function must<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return res.data as T;
}

const num = <T extends Record<string, unknown>>(row: T, ...keys: (keyof T)[]) => {
  const out = { ...row };
  for (const k of keys) if (out[k] != null) (out as Record<string, unknown>)[k as string] = Number(out[k]);
  return out;
};

/** Monday of the current week, as YYYY-MM-DD. */
export function weekOf(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoDay(d);
}

export async function loadUsers(db: Db): Promise<AppUser[]> {
  return must(await db.from('app_users').select('*').order('role'), 'Loading users');
}

export async function getUser(db: Db, id: string): Promise<AppUser | null> {
  return (await loadUsers(db)).find(u => u.id === id) ?? null;
}

export async function loadAccounts(db: Db): Promise<Account[]> {
  const rows = must(await db.from('accounts').select('*').order('id'), 'Loading accounts') as Account[];
  return rows.map(r => num(r, 'balance'));
}

export async function loadSnapshot(db: Db, now: Date): Promise<Snapshot> {
  const since = new Date(now.getTime() - 90 * 86_400_000).toISOString();
  const [accounts, scheduled, transactions, usage, burn, changes, feedback, decided] = await Promise.all([
    loadAccounts(db),
    db.from('scheduled_payments').select('*'),
    db.from('transactions').select('*').gte('occurred_at', since),
    db.from('vendor_usage').select('*'),
    db.from('burn_months').select('*'),
    db.from('known_changes').select('*'),
    db.from('checkin_feedback').select('card_type, rule, vendor, kind'),
    db.from('checkin_cards').select('type, rule, vendor').eq('week_of', weekOf(now)).neq('status', 'proposed'),
  ]);
  return {
    now,
    accounts,
    scheduled: must(scheduled, 'Loading payments').map((r: Record<string, unknown>) => num(r, 'amount')) as Snapshot['scheduled'],
    transactions: must(transactions, 'Loading transactions').map((r: Record<string, unknown>) => num(r, 'amount')) as Snapshot['transactions'],
    usage: must(usage, 'Loading usage') as Snapshot['usage'],
    burn: must(burn, 'Loading burn').map((r: Record<string, unknown>) => num(r, 'total')) as Snapshot['burn'],
    changes: must(changes, 'Loading changes').map((r: Record<string, unknown>) => num(r, 'monthly_delta')) as Snapshot['changes'],
    feedback: must(feedback, 'Loading feedback') as Feedback[],
    decided: must(decided, 'Loading decided cards') as Snapshot['decided'],
    cofounder: 'Jordan Ellis',
  };
}

function toCard(row: Record<string, unknown>): CheckinCard {
  return num(row as CheckinCard, 'runway_days');
}

/** The Inbox row for a card, so Check-in items also live in the full feed. */
function inboxEventFor(c: RankedCard): NewEvent {
  const a = c.action;
  const amount = a && 'amount' in a ? a.amount : a?.kind === 'lock_card' ? a.monthly_cost : c.monthly_impact;
  return {
    source: CARD_SOURCE[c.type],
    type: `checkin_${c.type}`,
    title: c.title,
    summary: c.question ?? 'See the breakdown in your Check-in',
    amount,
    counterparty: c.vendor,
    action_type: a?.kind === 'transfer' || a?.kind === 'lock_card' ? 'approve' : a?.kind === 'dispute' ? 'dispute' : null,
    due_at: null,
    meta: { checkin_rule: c.rule, reason: c.urgent ? 'Urgent · from your Check-in' : 'From your Check-in' },
  };
}

async function insertInboxEvent(db: Db, e: NewEvent): Promise<InboxEvent> {
  const { priority, reason } = classify(e);
  const row = { ...e, priority, meta: { ...e.meta, ...(reason ? { reason } : {}) } };
  return must(await db.from('inbox_events').insert(row).select('*').single(), 'Inserting inbox event') as InboxEvent;
}

async function audit(db: Db, rows: { actor: string; role: string; event: string; card_id?: string | null; detail?: Record<string, unknown> }[]) {
  if (rows.length) must(await db.from('audit_log').insert(rows.map(r => ({ detail: {}, ...r }))), 'Writing audit log');
}

/**
 * Run the engine and sync this week's proposed cards. Cards keep their id while they still
 * qualify (so an open screen doesn't break), new ones are added, and ones that dropped out are removed.
 */
export async function runCheckin(db: Db, now: Date = new Date()): Promise<Briefing> {
  const briefing = runEngine(await loadSnapshot(db, now));
  const week = weekOf(now);
  const existing = (must(
    await db.from('checkin_cards').select('*').eq('week_of', week).eq('status', 'proposed'),
    'Loading cards',
  ) as Record<string, unknown>[]).map(toCard);
  const keyOf = (c: { type: CardType; rule: string; vendor: string | null }) => `${c.type}|${c.rule}|${c.vendor ?? ''}`;
  const wanted = new Map(briefing.cards.map(c => [keyOf(c), c]));

  for (const old of existing) {
    const next = wanted.get(keyOf(old));
    if (next) {
      must(await db.from('checkin_cards').update({ ...cardColumns(next), data_as_of: briefing.data_as_of }).eq('id', old.id), 'Updating card');
      wanted.delete(keyOf(old));
    } else {
      must(await db.from('checkin_cards').delete().eq('id', old.id), 'Removing card');
      if (old.inbox_event_id) must(await db.from('inbox_events').delete().eq('id', old.inbox_event_id), 'Removing inbox row');
    }
  }

  for (const c of wanted.values()) {
    const event = await insertInboxEvent(db, inboxEventFor(c));
    const card = must(
      await db.from('checkin_cards').insert({ ...cardColumns(c), week_of: week, data_as_of: briefing.data_as_of, inbox_event_id: event.id }).select('id').single(),
      'Inserting card',
    ) as { id: string };
    must(await db.from('inbox_events').update({ meta: { ...event.meta, checkin_card_id: card.id } }).eq('id', event.id), 'Linking inbox row');
    await audit(db, [{ actor: 'rho', role: 'engine', event: 'card_suggested', card_id: card.id, detail: { title: c.title, rule: c.rule, rank: c.rank, runway_days: c.runway_days } }]);
  }

  await audit(db, [{ actor: 'rho', role: 'engine', event: 'checkin_generated', detail: { cards: briefing.cards.map(c => c.title), others: briefing.others.length } }]);
  return briefing;
}

function cardColumns(c: RankedCard) {
  return {
    type: c.type, rule: c.rule, vendor: c.vendor, urgent: c.urgent, runway_days: c.runway_days, rank: c.rank,
    title: c.title, question: c.question, why: c.why, proof: c.proof, action: c.action,
  };
}

export type CheckinView = {
  week_of: string;
  data_as_of: string;
  viewer: AppUser;
  cards: CardView[];
  others: string[];
  accounts: Account[];
  burn: Briefing['burn'];
  runway_months: number;
};

/** This week's briefing as one person sees it. Generates it on first read. */
export async function getCheckin(db: Db, viewer: AppUser, now: Date = new Date()): Promise<CheckinView> {
  const week = weekOf(now);
  const any = must(await db.from('checkin_cards').select('id').eq('week_of', week).limit(1), 'Checking for cards') as unknown[];
  const briefing = any.length ? runEngine(await loadSnapshot(db, now)) : await runCheckin(db, now);
  const rows = (must(
    await db.from('checkin_cards').select('*').eq('week_of', week).eq('status', 'proposed').order('rank'),
    'Loading cards',
  ) as Record<string, unknown>[]).map(toCard);
  return {
    week_of: week,
    data_as_of: briefing.data_as_of,
    viewer,
    cards: rows.map(c => viewCard(c, viewer)),
    others: briefing.others,
    accounts: await loadAccounts(db),
    burn: briefing.burn,
    runway_months: briefing.runway_months,
  };
}

export async function getCard(db: Db, id: string): Promise<CheckinCard | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const row = must(await db.from('checkin_cards').select('*').eq('id', id).maybeSingle(), 'Loading card');
  return row ? toCard(row as Record<string, unknown>) : null;
}

export type DecisionResult =
  | { ok: true; card: CardView; done: { headline: string; detail: string }; accounts: Account[]; next: CardView | null }
  | { ok: false; status: number; error: string };

/** Apply a tap: guardrails first (planDecision), then money, feedback, Inbox and audit, then re-rank. */
export async function decideCard(db: Db, cardId: string, decision: Decision, user: AppUser, now: Date = new Date()): Promise<DecisionResult> {
  const card = await getCard(db, cardId);
  if (!card) return { ok: false, status: 404, error: 'Card not found' };
  const accounts = await loadAccounts(db);
  const result = planDecision(card, decision, user, accounts, now);
  if (!result.ok) {
    await audit(db, [{ actor: user.id, role: user.role, event: 'decision_refused', card_id: card.id, detail: { decision, reason: result.error } }]);
    return result;
  }
  const plan = result.plan;

  // Claim the card first so a double tap can't move money twice.
  const claimed = must(
    await db.from('checkin_cards').update({ status: plan.status, decided_by: user.id, decided_at: now.toISOString() })
      .eq('id', card.id).eq('status', 'proposed').select('id'),
    'Updating card',
  ) as unknown[];
  if (!claimed.length) return { ok: false, status: 409, error: 'This card has already been decided.' };

  for (const b of plan.balances) {
    must(await db.from('accounts').update({ balance: b.balance, updated_at: now.toISOString() }).eq('id', b.id), 'Updating balance');
  }
  if (plan.lockVendor) must(await db.from('vendor_usage').update({ locked: true }).eq('vendor', plan.lockVendor), 'Locking card');
  if (plan.feedback) must(await db.from('checkin_feedback').insert({ ...plan.feedback, user_id: user.id }), 'Saving feedback');

  if (card.inbox_event_id) {
    const head = must(await db.from('inbox_events').select('thread_id').eq('id', card.inbox_event_id).maybeSingle(), 'Loading inbox row') as { thread_id: string } | null;
    must(await db.from('inbox_events').update({ status: plan.inbox.eventStatus, snooze_until: plan.inbox.snoozeUntil }).eq('id', card.inbox_event_id), 'Updating inbox row');
    if (plan.inbox.followUp && head) await insertInboxEvent(db, { ...plan.inbox.followUp, thread_id: head.thread_id, created_at: now.toISOString() });
  }

  await audit(db, plan.audit.map(a => ({ actor: user.id, role: user.role, event: a.event, card_id: card.id, detail: a.detail })));

  // Re-rank: a slot opened up, and the decision may have changed what qualifies.
  await runCheckin(db, now);
  const view = await getCheckin(db, user, now);
  const updated = await getCard(db, card.id);
  return { ok: true, card: viewCard(updated ?? card, user), done: plan.done, accounts: view.accounts, next: view.cards[0] ?? null };
}

export async function loadAudit(db: Db, limit = 100) {
  return must(
    await db.from('audit_log').select('*, card:checkin_cards(title, type)').order('created_at', { ascending: false }).limit(limit),
    'Loading audit log',
  );
}
