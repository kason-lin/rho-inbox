import { formatUSD } from '../format';
import type { NewEvent, Source } from '../types';
import type { Account, AccountId, AppUser, CardStatus, CardType, CheckinCard, Decision, Feedback } from './types';
import { OWN_ACCOUNTS } from './types';

/** Which Inbox source a card shows up under. */
export const CARD_SOURCE: Record<CardType, Source> = {
  payday_guard: 'treasury',
  suspicious_charge: 'cards',
  subscription_review: 'cards',
  burn_change: 'treasury',
};

export type DecisionPlan = {
  status: CardStatus;
  feedback: Feedback | null;
  balances: { id: AccountId; balance: number }[];
  lockVendor: string | null;
  inbox: { eventStatus: 'done' | 'snoozed'; snoozeUntil: string | null; followUp: Omit<NewEvent, 'thread_id'> | null };
  audit: { event: string; detail: Record<string, unknown> }[];
  done: { headline: string; detail: string };
};

export type PlanResult = { ok: true; plan: DecisionPlan } | { ok: false; status: 403 | 409 | 422; error: string };

export function canApprove(user: AppUser) {
  return user.role === 'admin';
}

/**
 * Turn a tap into effects, enforcing the guardrails: a person always decides, only admins approve,
 * account managers only look, and money moves only between the company's own accounts.
 */
export function planDecision(card: CheckinCard, decision: Decision, user: AppUser, accounts: Account[], now: Date = new Date()): PlanResult {
  if (card.status !== 'proposed') return { ok: false, status: 409, error: 'This card has already been decided.' };
  if (user.role === 'account_manager') {
    return { ok: false, status: 403, error: 'Account managers see the same cards to help faster, but only the company can decide.' };
  }

  const base = { key: card.type, rule: card.rule, vendor: card.vendor };
  const audit = (event: string, detail: Record<string, unknown> = {}) => ({ event, detail: { ...detail, card: card.title, rule: card.rule } });

  if (decision === 'not_now') {
    return {
      ok: true,
      plan: {
        status: 'not_now',
        feedback: { card_type: card.type, rule: card.rule, vendor: card.vendor, kind: 'not_now' },
        balances: [], lockVendor: null,
        inbox: { eventStatus: 'snoozed', snoozeUntil: nextMondayAt8(now).toISOString(), followUp: null },
        audit: [audit('decision_not_now')],
        done: { headline: 'Okay, not now.', detail: "We'll bring it back next Monday if it still matters." },
      },
    };
  }

  if (decision === 'wrong') {
    const subject = card.vendor ?? 'this';
    return {
      ok: true,
      plan: {
        status: 'wrong',
        feedback: { card_type: card.type, rule: card.rule, vendor: card.vendor, kind: 'wrong' },
        balances: [], lockVendor: null,
        inbox: {
          eventStatus: 'done', snoozeUntil: null,
          followUp: note(card, `Got it. We won't flag ${subject} for this again.`, 'Thanks. Your feedback tunes next week\'s Check-in.'),
        },
        audit: [audit('decision_wrong', { muted: base })],
        done: { headline: 'Thanks, noted.', detail: `We won't flag ${subject} for this rule again.` },
      },
    };
  }

  // approve
  if (!canApprove(user)) {
    return { ok: false, status: 403, error: `${user.name} can't approve this. An admin (Kason Lin or Jordan Ellis) has to.` };
  }
  const action = card.action;
  if (!action) return { ok: false, status: 422, error: 'This card has no action to approve.' };

  switch (action.kind) {
    case 'transfer': {
      const from = accounts.find(a => a.id === action.from);
      const to = accounts.find(a => a.id === action.to);
      if (!from || !to || action.from === action.to || !OWN_ACCOUNTS.includes(action.from) || !OWN_ACCOUNTS.includes(action.to)) {
        return { ok: false, status: 422, error: "Transfers can only move money between the company's own accounts." };
      }
      if (action.amount <= 0 || action.amount > from.balance) {
        return { ok: false, status: 422, error: `${from.name} doesn't have ${formatUSD(action.amount)} available.` };
      }
      const fromAfter = round2(from.balance - action.amount);
      const toAfter = round2(to.balance + action.amount);
      const isPayroll = card.type === 'payday_guard' && card.title.startsWith('Payroll');
      return {
        ok: true,
        plan: {
          status: 'approved', feedback: null, lockVendor: null,
          balances: [{ id: from.id, balance: fromAfter }, { id: to.id, balance: toAfter }],
          inbox: {
            eventStatus: 'done', snoozeUntil: null,
            followUp: {
              ...note(card, `Moved ${formatUSD(action.amount)} from ${from.name} to ${to.name}`, `${to.name} is now ${formatUSD(toAfter)}. ${isPayroll ? 'Payroll is covered.' : 'Upcoming bills are covered.'}`),
              source: 'treasury', type: 'transfer_completed', amount: action.amount, counterparty: `${to.name} ••${to.last4}`,
            },
          },
          audit: [
            audit('decision_approved', { approver: user.id }),
            audit('transfer_executed', { from: from.id, to: to.id, amount: action.amount, from_after: fromAfter, to_after: toAfter }),
          ],
          done: { headline: isPayroll ? 'Payroll is covered.' : 'Bills are covered.', detail: `Moved ${formatUSD(action.amount)} from ${from.name} to ${to.name}.` },
        },
      };
    }
    case 'lock_card':
      return {
        ok: true,
        plan: {
          status: 'approved', feedback: null, balances: [], lockVendor: action.vendor,
          inbox: {
            eventStatus: 'done', snoozeUntil: null,
            followUp: {
              ...note(card, `Locked card ••${action.card_last4} for ${action.vendor}`, `No more ${action.vendor} charges. Saves ${formatUSD(action.monthly_cost * 12)} a year.`),
              type: 'card_locked', amount: action.monthly_cost, counterparty: action.vendor,
            },
          },
          audit: [audit('decision_approved', { approver: user.id }), audit('card_locked', { vendor: action.vendor, card_last4: action.card_last4 })],
          done: { headline: `${action.vendor} is locked.`, detail: `Card ••${action.card_last4} won't pay ${action.vendor} again. That's ${formatUSD(action.monthly_cost * 12)} a year saved.` },
        },
      };
    case 'dispute':
      return {
        ok: true,
        plan: {
          status: 'approved', feedback: null, balances: [], lockVendor: null,
          inbox: {
            eventStatus: 'done', snoozeUntil: null,
            followUp: {
              ...note(card, `Dispute submitted for ${action.vendor}`, `${formatUSD(action.amount)} · ${action.reason}. Provisional credit while it's reviewed.`),
              type: 'dispute_opened', amount: action.amount, counterparty: action.vendor,
            },
          },
          audit: [audit('decision_approved', { approver: user.id }), audit('dispute_submitted', { vendor: action.vendor, amount: action.amount, transaction_id: action.transaction_id })],
          done: { headline: 'Dispute submitted.', detail: `${formatUSD(action.amount)} from ${action.vendor} is under review, with a provisional credit in the meantime.` },
        },
      };
    case 'share':
      return {
        ok: true,
        plan: {
          status: 'approved', feedback: null, balances: [], lockVendor: null,
          inbox: { eventStatus: 'done', snoozeUntil: null, followUp: note(card, `Shared the burn breakdown with ${action.to}`, card.title) },
          audit: [audit('shared_with_cofounder', { to: action.to, by: user.id })],
          done: { headline: `Shared with ${action.to.split(' ')[0]}.`, detail: 'They get the breakdown and the runway change. No money moved.' },
        },
      };
  }
}

function note(card: CheckinCard, title: string, summary: string): Omit<NewEvent, 'thread_id'> {
  return {
    source: CARD_SOURCE[card.type], type: 'checkin_followup', title, summary,
    amount: null, counterparty: card.vendor, action_type: null, due_at: null, status: 'read',
    meta: { checkin_card_id: card.id },
  };
}

export function nextMondayAt8(now: Date): Date {
  const d = new Date(now);
  d.setDate(d.getDate() + (((1 - d.getDay() + 7) % 7) || 7));
  d.setHours(8, 0, 0, 0);
  return d;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
