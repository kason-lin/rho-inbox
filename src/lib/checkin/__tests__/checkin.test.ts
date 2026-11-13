import { describe, expect, it } from 'vitest';
import { planDecision } from '../decide';
import { buildLoopLabs, snapshotFrom, TEAM, USERS } from '../demo-data';
import { runEngine, thresholdFor } from '../engine';
import type { CheckinCard, Snapshot, Txn } from '../types';
import { viewCard } from '../view';

// Thursday Nov 12, 9:00 local: payroll is due tomorrow (Friday).
const NOW = new Date(2026, 10, 12, 9, 0);
const fresh = (): Snapshot => snapshotFrom(buildLoopLabs(NOW), NOW);
const user = (id: string) => USERS.find(u => u.id === id)!;
const asCard = (s: Snapshot, i = 0): CheckinCard => {
  const c = runEngine(s).cards[i];
  return { ...c, id: `card-${i}`, week_of: '2026-11-09', status: 'proposed', data_as_of: NOW.toISOString(), inbox_event_id: null, decided_by: null, decided_at: null };
};

function duplicateOf(s: Snapshot, vendor: string): Txn {
  const original = s.transactions.find(t => t.vendor === vendor)!;
  return { ...original, id: 'dup', recurring: false, occurred_at: new Date(NOW.getTime() - 3_600_000).toISOString() };
}

describe('Loop Labs Monday check-in (spec numbers)', () => {
  const b = runEngine(fresh());

  it('shows exactly the three cards from the spec, in order', () => {
    expect(b.cards.map(c => c.type)).toEqual(['payday_guard', 'subscription_review', 'burn_change']);
    expect(b.cards.map(c => c.rank)).toEqual([1, 2, 3]);
  });

  it('payday guard: $4,200 short, suggests moving $5,000 from treasury', () => {
    const c = b.cards[0];
    expect(c.title).toBe('Payroll Friday: checking is $4,200 short.');
    expect(c.question).toBe('Move $5,000 from treasury?');
    expect(c.action).toMatchObject({ kind: 'transfer', from: 'treasury', to: 'checking', amount: 5000 });
    expect(c.urgent).toBe(true);
  });

  it('subscription review: the $250/mo tool unused 60 days makes the list despite its small cost', () => {
    const c = b.cards[1];
    expect(c.title).toBe('$250/mo Mixpanel plan, unused 60 days.');
    expect(c.runway_days).toBeLessThan(1);
    expect(c.action).toMatchObject({ kind: 'lock_card', card_last4: '4417' });
  });

  it('burn change: +12%, runway 12 → 10.7 months, no money action', () => {
    const c = b.cards[2];
    expect(c.title).toBe('Burn up 12%: runway 12 → 10.7 months.');
    expect(b.burn).toMatchObject({ average: 87000, projected: 97440 });
    expect(b.total_cash).toBe(1_044_000);
    expect(c.action?.kind).toBe('share');
    expect(c.runway_days).toBeGreaterThanOrEqual(3);
  });

  it('"We checked 14 other things"', () => {
    expect(b.others).toHaveLength(14);
    expect(b.others).toContain('No duplicate or unusual card charges in the last 14 days');
  });
});

describe('ranking and feedback', () => {
  it('a duplicate charge is urgent: it takes slot 2 and pushes burn to the one-liners', () => {
    const s = fresh();
    s.transactions.push(duplicateOf(s, 'Figma'));
    const b = runEngine(s);
    expect(b.cards.map(c => c.type)).toEqual(['payday_guard', 'suspicious_charge', 'subscription_review']);
    expect(b.cards[1].title).toMatch(/^Figma charged \$180 twice in \d+ days\.$/);
    expect(b.others.some(o => o.startsWith('Burn up 12%') && o.endsWith('(lower priority this week)'))).toBe(true);
    expect(b.others).toHaveLength(14);
  });

  it('"This is wrong" mutes that rule for that vendor', () => {
    const s = fresh();
    s.feedback.push({ card_type: 'subscription_review', rule: 'unused_60_days', vendor: 'Mixpanel', kind: 'wrong' });
    expect(runEngine(s).cards.map(c => c.type)).toEqual(['payday_guard', 'burn_change']);
  });

  it('two "Not now" taps raise the bar for that card type', () => {
    const s = fresh();
    s.feedback.push(
      { card_type: 'burn_change', rule: 'burn_10pct', vendor: null, kind: 'not_now' },
      { card_type: 'burn_change', rule: 'burn_10pct', vendor: null, kind: 'not_now' },
    );
    expect(thresholdFor('burn_change', s.feedback)).toBe(6);
    const b = runEngine(s);
    expect(b.cards.map(c => c.type)).toEqual(['payday_guard', 'subscription_review']);
    expect(b.others.some(o => o.includes('under 6 days of runway'))).toBe(true);
  });

  it('after the transfer, payroll no longer needs a card', () => {
    const s = fresh();
    s.accounts.find(a => a.id === 'checking')!.balance = 16_800;
    const b = runEngine(s);
    expect(b.cards.map(c => c.type)).not.toContain('payday_guard');
    expect(b.others).toContain('Checking covers the $16,000.00 due in the next 7 days');
  });
});

describe('guardrails', () => {
  it('only admins approve; account managers only look', () => {
    const s = fresh();
    const card = asCard(s);
    expect(planDecision(card, 'approve', user('ana'), s.accounts, NOW)).toMatchObject({ ok: false, status: 403 });
    expect(planDecision(card, 'not_now', user('dana'), s.accounts, NOW)).toMatchObject({ ok: false, status: 403 });
    const ok = planDecision(card, 'approve', user('kason'), s.accounts, NOW);
    expect(ok.ok && ok.plan.done.headline).toBe('Payroll is covered.');
    expect(ok.ok && ok.plan.balances).toEqual([{ id: 'treasury', balance: 1_027_200 }, { id: 'checking', balance: 16_800 }]);
    expect(ok.ok && ok.plan.audit.map(a => a.event)).toEqual(['decision_approved', 'transfer_executed']);
  });

  it("refuses transfers that aren't between the company's own accounts, or are already decided", () => {
    const s = fresh();
    const card = asCard(s);
    const outside = { ...card, action: { ...card.action!, to: 'someone_else' } } as unknown as CheckinCard;
    expect(planDecision(outside, 'approve', user('kason'), s.accounts, NOW)).toMatchObject({ ok: false, status: 422 });
    expect(planDecision({ ...card, status: 'approved' }, 'approve', user('kason'), s.accounts, NOW)).toMatchObject({ ok: false, status: 409 });
  });

  it('hides payroll details from non-admins', () => {
    const s = fresh();
    const burn = asCard(s, 2);
    const asAna = viewCard(burn, user('ana'));
    expect(asAna.redacted).toBe(true);
    expect(JSON.stringify(asAna.proof)).not.toContain('Priya Shah');
    expect(asAna.proof.flatMap(p => p.items).filter(i => i.payroll).every(i => i.amount === null)).toBe(true);
    expect(viewCard(burn, user('kason')).redacted).toBe(false);
    expect(viewCard(burn, user('dana')).proof).toEqual(burn.proof);   // the rep sees the same card
  });

  it('team cards in the demo data are distinct', () => {
    expect(new Set(TEAM.map(t => t.card)).size).toBe(TEAM.length);
  });
});
