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
  const approved = { ...nov18, approval: { transfer_amount: 25000, pay_date: '2026-12-02', approved_at: '', approved_by: 'Kason Lin', reference: 'BH-1' } };

  it('before approval: the invoice first, then the unused tool, then spend by purpose', () => {
    const v = healthView(nov18);
    expect(v.needs_you.cards.map(c => c.type)).toEqual(['money_owed', 'subscription', 'spend']);
    expect(v.needs_you.cards[0].title).toBe('$55K invoice from Northbeam Studio due Dec 2. Checking will be $19,800 short.');
    expect(v.needs_you.others).toBe(14);
  });

  it('after approval the invoice is handled and the Figma duplicate moves up', () => {
    const v = healthView(approved);
    expect(v.needs_you.cards.map(c => c.type)).toEqual(['duplicate', 'subscription', 'spend']);
    expect(v.needs_you.handled.map(c => c.type)).toEqual(['money_owed']);
    expect(v.forecast?.shortfall).toBe(0);
    expect(v.forecast_before?.shortfall).toBe(19800);
  });

  it('cancelling the tool and disputing the charge mark them handled', () => {
    const v = healthView({ ...approved, handled: { 'sub-miro': 'cancelled', 'dup-figma': 'disputed' } });
    expect(v.needs_you.cards.map(c => c.type)).toEqual(['spend']);
    expect(v.needs_you.handled.map(c => c.handled_text)).toContain('Miro cancelled and card locked · saves $600 a year');
  });

  it('muted cards disappear', () => {
    expect(needsYou(null, { ...nov18, muted: ['sub-miro'] }).cards.map(c => c.type)).toEqual(['spend']);
  });

  it('KPIs: burn up 12%, runway 10.7 months (was 12)', () => {
    expect(healthView(nov18).kpis).toMatchObject({ checking: 62400, burn: 115920, burn_change: 12, runway: 10.7, runway_was: 12 });
  });
});

describe('inbox invoice details', () => {
  it('pulls out the line items, which add up to the amount due', () => {
    const [inv] = invoicesFor(nov18);
    expect(inv.lines).toEqual([{ label: 'Research and UX', amount: 38000 }, { label: 'Visual design and prototype', amount: 17000 }]);
    expect(inv.lines.reduce((t, l) => t + l.amount, 0)).toBe(inv.amount);
  });
});

describe('spend by purpose', () => {
  it('Claude $50,000 = $32,000 building + $18,000 running, matching the card charge exactly', () => {
    const { claude } = spendByPurpose();
    expect(claude.charge.amount).toBe(50000);
    expect(claude.purposes.map(p => [p.label, p.amount])).toEqual([['Building the product', 32000], ['Running the product for customers', 18000]]);
    expect(claude.matches_charge).toBe(true);
    expect(claude.purposes.flatMap(p => p.projects).reduce((t, p) => t + p.amount, 0)).toBe(50000);
  });

  it('four providers, coverage, and the OpenAI $300 mismatch', () => {
    const s = spendByPurpose();
    expect(s.providers.map(p => [p.name, p.total])).toEqual([['Claude (Anthropic)', 50000], ['AWS', 14000], ['OpenAI', 6000], ['SaaS tools (23)', 9000]]);
    expect(Math.round(s.coverage * 100)).toBe(92);
    expect(s.match.find(m => m.name === 'OpenAI')?.difference).toBe(300);
    expect(s.match.find(m => m.name === 'Anthropic')?.difference).toBe(0);
  });
});
