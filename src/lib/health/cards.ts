/**
 * "Needs you": the 3 cards at most that Business health asks the founder to decide on.
 * Urgent first (money owed), then by impact in days of runway; anything else becomes "looks fine".
 */
import { DATA } from './data';
import { shortDay } from './dates';
import { dollars, thousands, type Alert } from './forecast';
import { spendByPurpose } from './spend';

export type HealthCard = {
  id: string;
  type: 'money_owed' | 'subscription' | 'burn';
  urgent: boolean;
  title: string;
  question: string | null;
  href: string;          // where "Review" goes
  why: string;           // "Why am I seeing this?"
  runway_days: number | null;
};

export function needsYou(alert: Alert | null, approved: boolean, muted: string[]): { cards: HealthCard[]; others: number } {
  const { company } = DATA;
  const perDay = company.burn.three_month_average / 30;
  const cards: HealthCard[] = [];

  if (alert && !approved) {
    cards.push({
      id: 'money-owed',
      type: 'money_owed',
      urgent: true,
      title: `${thousands(alert.invoice.amount)} invoice from ${alert.invoice.vendor} is due ${shortDay(alert.invoice.due)}. Checking will be ${dollars(alert.short_by)} short.`,
      question: 'Set aside cash from treasury and schedule the payment?',
      href: '/business-health/proof',
      why: 'An invoice is due in the next 30 days, projected checking can’t cover it on its due date, and treasury can.',
      runway_days: null,
    });
  }

  for (const s of company.subscriptions) {
    cards.push({
      id: s.id,
      type: 'subscription',
      urgent: false,
      title: `${dollars(s.monthly)}/mo ${s.vendor} plan, unused ${s.last_login_days} days.`,
      question: 'Cancel it?',
      href: '/business-health#needs-you',
      why: `Nobody has signed in to ${s.vendor} for ${s.last_login_days} days, but it still charges ${s.card_owner}’s card. Unused tools always make the list.`,
      runway_days: round1(s.monthly / perDay),
    });
  }

  const { three_month_average: avg, projected } = company.burn;
  const pct = Math.round(((projected - avg) / avg) * 100);
  const cash = company.checking.balance + company.treasury.balance;
  cards.push({
    id: 'burn',
    type: 'burn',
    urgent: false,
    title: `Burn up ${pct}%: runway ${round1(cash / avg)} → ${round1(cash / projected)} months.`,
    question: null,
    href: '/business-health/spend',
    why: `Projected monthly burn (${dollars(projected)}) is ${pct}% above the 3-month average (${dollars(avg)}). We flag moves of 10% or more.`,
    runway_days: round1((projected - avg) / perDay),
  });

  const shown = cards.filter(c => !muted.includes(c.id)).slice(0, 3);
  return { cards: shown, others: company.other_checks };
}

/** The "Where it goes" summary for the tab. */
export function whereItGoes() {
  const s = spendByPurpose();
  return { provider: s.provider, amount: s.charge.amount, purposes: s.purposes.map(p => ({ label: p.label, amount: p.amount })) };
}

const round1 = (n: number) => Math.round(n * 10) / 10;
