import { daysUntil, formatUSD } from './format';
import type { NewEvent, Priority } from './types';

export type Classification = { priority: Priority; reason: string | null };

const BILL_WINDOW_DAYS = 3;
const UNUSUAL_MULTIPLE = 3;
const LOW_RUNWAY_MONTHS = 2;

type Classifiable = Pick<NewEvent, 'source' | 'type' | 'amount' | 'due_at' | 'meta'>;

/**
 * Decide whether an event needs the finance lead or is just FYI.
 * Pure, so it runs at insert time and again when listing (a bill due in 5 days
 * becomes urgent later without anyone touching it).
 */
export function classify(e: Classifiable, now: Date = new Date()): Classification {
  const fyi: Classification = { priority: 'fyi', reason: null };

  // Check-in cards already passed the Check-in engine's own rules; their follow-ups are just notes.
  if (e.type === 'checkin_followup') return fyi;
  if (e.type.startsWith('checkin_')) {
    return { priority: 'needs_action', reason: typeof e.meta.reason === 'string' ? e.meta.reason : 'From your Check-in' };
  }

  switch (e.source) {
    case 'approvals':
      if (e.type === 'approval_requested') {
        return { priority: 'needs_action', reason: 'Waiting on your approval' };
      }
      return fyi;

    case 'bill_pay': {
      if (e.type !== 'bill_due' || !e.due_at) return fyi;
      const days = daysUntil(e.due_at, now);
      if (days < 0) return { priority: 'needs_action', reason: `Overdue by ${-days} ${plural(-days, 'day')}` };
      if (days === 0) return { priority: 'needs_action', reason: 'Due today' };
      if (days === 1) return { priority: 'needs_action', reason: 'Due tomorrow' };
      if (days < BILL_WINDOW_DAYS) return { priority: 'needs_action', reason: `Due in ${days} days` };
      return fyi;
    }

    case 'cards': {
      if (e.type !== 'card_charge' || e.amount == null) return fyi;
      const typical = e.meta.typical_amount;
      if (typical && e.amount > typical * UNUSUAL_MULTIPLE) {
        const multiple = (e.amount / typical).toFixed(1);
        return { priority: 'needs_action', reason: `${multiple}× ${e.meta.cardholder ?? 'this card'}'s typical charge` };
      }
      if (e.meta.new_category) {
        return { priority: 'needs_action', reason: `First ${e.meta.category ?? 'new-category'} charge on this card` };
      }
      return fyi;
    }

    case 'treasury': {
      const { balance, monthly_burn } = e.meta;
      if (balance == null || !monthly_burn) return fyi;
      const months = balance / monthly_burn;
      if (months < LOW_RUNWAY_MONTHS) {
        return { priority: 'needs_action', reason: `Operating cash covers ${months.toFixed(1)} months (${formatUSD(balance)})` };
      }
      return fyi;
    }

    case 'invoicing': {
      const open = e.type === 'invoice_sent' || e.type === 'invoice_viewed';
      if (!open || !e.due_at) return fyi;
      const days = daysUntil(e.due_at, now);
      if (days < 0) return { priority: 'needs_action', reason: `Unpaid, ${-days} ${plural(-days, 'day')} past due` };
      return fyi;
    }
  }
}

function plural(n: number, word: string) {
  return n === 1 ? word : `${word}s`;
}
