import { formatUSD, shortDate } from './format';
import type { Action, InboxEvent, NewEvent } from './types';

export type ActionCheck = { ok: true } | { ok: false; error: string };

export function allowedActions(e: InboxEvent): Action[] {
  if (e.status === 'done' || !e.action_type) return [];
  return [e.action_type];
}

export function canTakeAction(e: InboxEvent, action: Action): ActionCheck {
  if (e.status === 'done') return { ok: false, error: 'This item is already done.' };
  if (!allowedActions(e).includes(action)) {
    return { ok: false, error: `Can't ${action} a ${e.type.replace(/_/g, ' ')}.` };
  }
  return { ok: true };
}

/**
 * The event that lands in the same thread after an action. In production this would be the
 * confirmation webhook from the product's own API; here it stands in for that round trip.
 */
export function followUpFor(e: InboxEvent, action: Action, now: Date = new Date()): NewEvent {
  const base = {
    source: e.source,
    amount: e.amount,
    counterparty: e.counterparty,
    thread_id: e.thread_id,
    action_type: null,
    due_at: null,
    status: 'read' as const,      // you just did it, so it shouldn't shout at you
    created_at: now.toISOString(),
  };

  switch (action) {
    case 'pay': {
      const arrives = nextBusinessDay(now);
      return {
        ...base,
        type: 'payment_scheduled',
        title: `Payment scheduled to ${e.counterparty}`,
        summary: `${formatUSD(e.amount)} via same-day ACH, arriving ${shortDate(arrives.toISOString())}.`,
        meta: { paid_event_id: e.id },
      };
    }
    case 'approve':
      return {
        ...base,
        type: 'approval_granted',
        title: `You approved: ${e.title}`,
        summary: e.meta.requested_by
          ? `${e.meta.requested_by} has been notified. Funds release with the next payout run.`
          : 'The requester has been notified.',
        meta: { approved_event_id: e.id, requested_by: e.meta.requested_by },
      };
    case 'dispute':
      return {
        ...base,
        type: 'dispute_opened',
        title: `Dispute opened for ${e.counterparty}`,
        summary: `${formatUSD(e.amount)} provisional credit issued while the charge is reviewed. The card stays active.`,
        meta: { disputed_event_id: e.id, cardholder: e.meta.cardholder },
      };
  }
}

function nextBusinessDay(from: Date): Date {
  const d = new Date(from);
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}
