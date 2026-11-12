import { describe, expect, it } from 'vitest';
import { canTakeAction, followUpFor } from '../actions';
import { classify } from '../priority';
import { advanceInvoice, billDue, cardCharge, mulberry32, simulate, SCENARIOS } from '../simulator';
import { buildThreads, filterThreads, summarize } from '../threads';
import type { InboxEvent, NewEvent } from '../types';

const NOW = new Date('2026-11-12T15:00:00Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

let n = 0;
function ev(partial: Partial<NewEvent> & Pick<NewEvent, 'source' | 'type'>, extra: Partial<InboxEvent> = {}): InboxEvent {
  n++;
  return {
    id: `e${n}`, title: 't', summary: null, amount: null, counterparty: null, action_type: null,
    due_at: null, meta: {}, priority: 'fyi', status: 'unread', snooze_until: null,
    thread_id: `t${n}`, created_at: new Date(NOW.getTime() - (100 - n) * 60_000).toISOString(),
    ...partial, ...extra,
  } as InboxEvent;
}

describe('classify', () => {
  it('flags bills due in under 3 days, not later ones', () => {
    expect(classify(ev({ source: 'bill_pay', type: 'bill_due', due_at: inDays(1) }), NOW))
      .toEqual({ priority: 'needs_action', reason: 'Due tomorrow' });
    expect(classify(ev({ source: 'bill_pay', type: 'bill_due', due_at: inDays(2) }), NOW).priority).toBe('needs_action');
    expect(classify(ev({ source: 'bill_pay', type: 'bill_due', due_at: inDays(5) }), NOW).priority).toBe('fyi');
    expect(classify(ev({ source: 'bill_pay', type: 'bill_due', due_at: inDays(-2) }), NOW).reason).toBe('Overdue by 2 days');
  });

  it('flags card charges over 3× typical or in a new category', () => {
    const meta = { cardholder: 'Priya Shah', typical_amount: 100 };
    expect(classify(ev({ source: 'cards', type: 'card_charge', amount: 350, meta }), NOW))
      .toEqual({ priority: 'needs_action', reason: "3.5× Priya Shah's typical charge" });
    expect(classify(ev({ source: 'cards', type: 'card_charge', amount: 120, meta }), NOW).priority).toBe('fyi');
    expect(classify(ev({ source: 'cards', type: 'card_charge', amount: 20, meta: { ...meta, new_category: true, category: 'Gambling' } }), NOW).priority).toBe('needs_action');
  });

  it('flags low runway, pending approvals and overdue invoices', () => {
    expect(classify(ev({ source: 'treasury', type: 'low_balance', meta: { balance: 500_000, monthly_burn: 400_000 } }), NOW).priority).toBe('needs_action');
    expect(classify(ev({ source: 'treasury', type: 'yield_credited', meta: { balance: 5_000_000, monthly_burn: 400_000 } }), NOW).priority).toBe('fyi');
    expect(classify(ev({ source: 'approvals', type: 'approval_requested' }), NOW).priority).toBe('needs_action');
    expect(classify(ev({ source: 'approvals', type: 'approval_granted' }), NOW).priority).toBe('fyi');
    expect(classify(ev({ source: 'invoicing', type: 'invoice_sent', due_at: inDays(-3) }), NOW).reason).toBe('Unpaid, 3 days past due');
    expect(classify(ev({ source: 'invoicing', type: 'invoice_paid', due_at: inDays(-3) }), NOW).priority).toBe('fyi');
  });
});

describe('actions', () => {
  it('only allows the action an event offers, and not once done', () => {
    const bill = ev({ source: 'bill_pay', type: 'bill_due', action_type: 'pay' });
    expect(canTakeAction(bill, 'pay')).toEqual({ ok: true });
    expect(canTakeAction(bill, 'dispute').ok).toBe(false);
    expect(canTakeAction({ ...bill, status: 'done' }, 'pay').ok).toBe(false);
  });

  it('appends a follow-up to the same thread', () => {
    const bill = ev({ source: 'bill_pay', type: 'bill_due', action_type: 'pay', amount: 4212.5, counterparty: 'Amazon Web Services' });
    const f = followUpFor(bill, 'pay', NOW);
    expect(f.thread_id).toBe(bill.thread_id);
    expect(f.type).toBe('payment_scheduled');
    expect(f.summary).toContain('$4,212.50');
    expect(classify(f, NOW).priority).toBe('fyi');
  });
});

describe('threads', () => {
  it('moves a thread from Needs action to FYI once it is paid', () => {
    const bill = ev({ source: 'bill_pay', type: 'bill_due', action_type: 'pay', due_at: inDays(1) }, { thread_id: 'aws' });
    expect(buildThreads([bill], NOW)[0]).toMatchObject({ priority: 'needs_action', actions: ['pay'] });

    const paid = { ...bill, status: 'done' as const };
    const followUp = ev(followUpFor(bill, 'pay', NOW), { thread_id: 'aws', status: 'read', created_at: NOW.toISOString() });
    const [t] = buildThreads([paid, followUp], NOW);
    expect(t).toMatchObject({ priority: 'fyi', actions: [], status: 'read' });
    expect(t.events.map(e => e.type)).toEqual(['bill_due', 'payment_scheduled']);
  });

  it('filters by source, priority, status and search, and summarizes', () => {
    const events = [
      ev({ source: 'approvals', type: 'approval_requested', title: 'Reimbursement from Marcus', action_type: 'approve' }),
      ev({ source: 'cards', type: 'card_charge', title: 'Figma', amount: 40, meta: { typical_amount: 100 } }, { status: 'read' }),
      ev({ source: 'treasury', type: 'yield_credited', title: 'Yield' }, { status: 'done' }),
      ev({ source: 'cards', type: 'card_charge', title: 'Snoozed' }, { status: 'snoozed' }),
    ];
    const threads = buildThreads(events, NOW);
    expect(filterThreads(threads, {}).length).toBe(2);
    expect(filterThreads(threads, { status: 'done' }).map(t => t.head.title)).toEqual(['Yield']);
    expect(filterThreads(threads, { source: 'cards' }).length).toBe(1);
    expect(filterThreads(threads, { priority: 'needs_action' }).length).toBe(1);
    expect(filterThreads(threads, { q: 'marcus' }).length).toBe(1);
    expect(summarize(threads)).toMatchObject({ needs_action: 1, unread: 1 });
  });
});

describe('simulator', () => {
  it('makes realistic, correctly classified events for every scenario', () => {
    const rng = mulberry32(7);
    for (const s of SCENARIOS) {
      const e = simulate(s, rng, NOW);
      expect(e.title.length).toBeGreaterThan(5);
      if (e.amount != null) expect(Number.isInteger(Math.round(e.amount * 100))).toBe(true);
    }
    expect(classify(cardCharge(rng, { unusual: true }), NOW).priority).toBe('needs_action');
    expect(classify(cardCharge(rng), NOW).priority).toBe('fyi');
    expect(classify(billDue(rng, NOW, { dueInDays: 1 }), NOW).priority).toBe('needs_action');
  });

  it('walks an invoice from sent to deposited, then stops', () => {
    const rng = mulberry32(1);
    let last = ev(simulate('invoice_progress', rng, NOW), { thread_id: 'inv' });
    const types = [last.type];
    for (let next = advanceInvoice(last); next; next = advanceInvoice(last)) {
      last = ev(next, { thread_id: 'inv' });
      types.push(last.type);
    }
    expect(types).toEqual(['invoice_sent', 'invoice_viewed', 'invoice_paid', 'invoice_deposited']);
  });
});
