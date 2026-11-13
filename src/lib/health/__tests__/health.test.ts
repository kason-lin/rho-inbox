// Locks in the demo story's numbers from the build spec, so editing code can't quietly break the pitch.
import { describe, expect, it } from 'vitest';
import { DEMO_DATES } from '../data';
import { needsYou } from '../cards';
import { extractInvoices } from '../extract';
import { alertFor, forecast, suggestedPlan, validatePlan } from '../forecast';
import { spendByPurpose } from '../spend';
import { FRESH } from '../state';
import { healthView, invoicesFor, visibleEmails } from '../view';

const nov18 = { ...FRESH, date: DEMO_DATES.alert };

describe('inbox → invoice', () => {
  it('on Oct 3 the Northbeam email is in the inbox and its invoice is found', () => {
    const state = { ...FRESH };
    expect(visibleEmails(state)[0].id).toBe('em-northbeam-invoice');
    const [inv] = invoicesFor(state);
    expect(inv).toMatchObject({ vendor: 'Northbeam Studio', amount: 55000, issued: '2026-10-03', terms_days: 60, due: '2026-12-02' });
  });

  it('only invoice emails are extracted', () => {
    expect(extractInvoices(visibleEmails(nov18))).toHaveLength(1);
  });
});

describe('forecast and alert on Nov 18', () => {
  const invoices = invoicesFor(nov18);

  it('checking is $35,200 before the invoice and $19,800 short on Dec 2', () => {
    const f = forecast(invoices, null);
    expect(f.series.find(p => p.date === '2026-12-01')?.balance).toBe(35200);
    expect(f.low).toEqual({ date: '2026-12-02', balance: -19800 });
    expect(f.shortfall).toBe(19800);
  });

  it('the alert reads exactly as in the spec', () => {
    expect(alertFor(invoices, DEMO_DATES.alert)?.text).toBe('A $55K invoice is due in 14 days. Checking will be $19,800 short.');
  });

  it('suggests setting aside $25,000 and paying on Dec 2; that closes the gap', () => {
    const plan = suggestedPlan(invoices[0], 19800);
    expect(plan).toEqual({ transfer_amount: 25000, pay_date: '2026-12-02' });
    const after = forecast(invoices, plan, DEMO_DATES.alert);
    expect(after.shortfall).toBe(0);
    expect(after.series.at(-1)?.balance).toBe(5200);
  });

  it('rejects plans that move too much or pay late', () => {
    expect(validatePlan({ transfer_amount: 2_000_000, pay_date: '2026-12-02' }, invoices[0], DEMO_DATES.alert)).toMatch(/Treasury/);
    expect(validatePlan({ transfer_amount: 25000, pay_date: '2026-12-03' }, invoices[0], DEMO_DATES.alert)).toMatch(/due date/);
  });

  it('nothing is forecast yet on Oct 3', () => {
    expect(healthView(FRESH).forecast).toBeNull();
    expect(healthView(FRESH).alert).toBeNull();
  });
});

describe('needs you', () => {
  it('3 cards: money owed first, then the unused $50 tool, then burn 12 → 10.7 months', () => {
    const view = healthView(nov18);
    expect(view.needs_you.cards.map(c => c.type)).toEqual(['money_owed', 'subscription', 'burn']);
    expect(view.needs_you.cards[2].title).toBe('Burn up 12%: runway 12 → 10.7 months.');
    expect(view.needs_you.others).toBe(14);
  });

  it('after approval the money-owed card is gone', () => {
    const approved = { ...nov18, approval: { transfer_amount: 25000, pay_date: '2026-12-02', approved_at: '', approved_by: 'Kason Lin', reference: 'BH-1' } };
    expect(healthView(approved).needs_you.cards.map(c => c.type)).toEqual(['subscription', 'burn']);
    expect(healthView(approved).forecast?.shortfall).toBe(0);
  });

  it('muted cards disappear', () => {
    expect(needsYou(null, false, ['burn']).cards.map(c => c.type)).toEqual(['subscription']);
  });
});

describe('spend by purpose', () => {
  it('Claude $50,000 = $32,000 building + $18,000 running, matching the card charge exactly', () => {
    const s = spendByPurpose();
    expect(s.charge.amount).toBe(50000);
    expect(s.purposes.map(p => [p.label, p.amount])).toEqual([['Building the product', 32000], ['Running the product for customers', 18000]]);
    expect(s.matches_charge).toBe(true);
    expect(s.purposes.flatMap(p => p.projects).reduce((t, p) => t + p.amount, 0)).toBe(50000);
  });
});
