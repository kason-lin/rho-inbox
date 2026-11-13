/**
 * The heart of Business health: lists what Loop Labs owes, projects the checking balance day by day,
 * and finds the shortfall. Pure functions: same inputs, same answer, which keeps the demo numbers exact.
 */
import { DATA } from './data';
import { addDays, daysBetween, eachDay } from './dates';
import type { Invoice } from './extract';

export type Source = { tool: 'Gmail' | 'Gusto' | 'Stripe' | 'Rho Bill Pay' | 'Rho'; ref: string; href: string };

export type Obligation = {
  id: string;
  kind: 'invoice' | 'payroll' | 'bill';
  label: string;
  counterparty: string;
  amount: number;
  date: string;          // when the money leaves checking
  due: string;           // when it's due
  status: 'unpaid' | 'scheduled';
  detail: string;
  source: Source;
};

export type CashEvent = {
  id: string;
  date: string;
  amount: number;        // + money in, − money out
  label: string;
  kind: 'invoice' | 'payroll' | 'bill' | 'payout' | 'transfer';
  source: Source;
};

/** What the user approves: how much to move from treasury (moves today), and when to pay the invoice. */
export type Plan = { transfer_amount: number; pay_date: string };

export type Forecast = {
  start: string;
  end: string;
  opening: number;
  series: { date: string; balance: number }[];
  events: CashEvent[];
  low: { date: string; balance: number };
  shortfall: number;     // 0 when checking never goes below zero
};

export function obligations(invoices: Invoice[], plan: Plan | null): Obligation[] {
  const { company } = DATA;
  const items: Obligation[] = [
    ...invoices.map(inv => ({
      id: `invoice-${inv.id}`,
      kind: 'invoice' as const,
      label: `Invoice ${inv.number ?? ''}`.trim(),
      counterparty: inv.vendor,
      amount: inv.amount,
      date: plan?.pay_date ?? inv.due,
      due: inv.due,
      status: plan ? ('scheduled' as const) : ('unpaid' as const),
      detail: `Sent ${inv.issued}, net ${inv.terms_days}. Found in email; not in Rho Bills or the bank yet.`,
      source: { tool: 'Gmail' as const, ref: inv.subject, href: `/mailbox?email=${inv.id}` },
    })),
    ...company.payroll.map(p => ({
      id: p.id, kind: 'payroll' as const, label: p.label, counterparty: 'Gusto payroll', amount: p.amount,
      date: p.date, due: p.date, status: 'scheduled' as const, detail: p.detail,
      source: { tool: 'Gusto' as const, ref: `Pay run ${p.date}`, href: `/business-health/source/payroll/${p.id}` },
    })),
    ...(company.bills as { id: string; date: string; amount: number; vendor: string; label: string; detail: string }[]).map(b => ({
      id: b.id, kind: 'bill' as const, label: b.label, counterparty: b.vendor, amount: b.amount,
      date: b.date, due: b.date, status: 'scheduled' as const, detail: b.detail,
      source: { tool: 'Rho Bill Pay' as const, ref: `${b.vendor} bill`, href: `/business-health/source/bill/${b.id}` },
    })),
  ];
  return items.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}

/**
 * Projected checking balance for each day of the window. With a plan, the treasury transfer lands on
 * `transferDate` (the approval day; treasury transfers settle in 0–2 business days) and the invoice is
 * paid on the plan's date.
 */
export function forecast(invoices: Invoice[], plan: Plan | null, transferDate?: string): Forecast {
  const { company, stripe } = DATA;
  const start = company.forecast_start;
  const end = company.forecast_end;

  const events: CashEvent[] = [
    ...obligations(invoices, plan).map(o => ({ id: o.id, date: o.date, amount: -o.amount, label: `${o.counterparty} · ${o.label}`, kind: o.kind, source: o.source })),
    ...stripe.payouts.map(p => ({
      id: p.id, date: p.date, amount: p.amount, label: 'Stripe payout', kind: 'payout' as const,
      source: { tool: 'Stripe' as const, ref: p.id, href: `/business-health/source/payout/${p.id}` },
    })),
  ];
  if (plan && plan.transfer_amount > 0) {
    events.push({
      id: 'transfer-plan', date: transferDate ?? start, amount: plan.transfer_amount, label: `Transfer from Treasury ••${company.treasury.last4}`, kind: 'transfer',
      source: { tool: 'Rho', ref: `Treasury ••${company.treasury.last4}`, href: '/business-health/done' },
    });
  }
  const inWindow = events.filter(e => e.date >= start && e.date <= end).sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);

  let balance = company.checking.balance;
  const series = eachDay(start, end).map(date => {
    balance += inWindow.filter(e => e.date === date).reduce((s, e) => s + e.amount, 0);
    return { date, balance: round2(balance) };
  });
  const low = series.reduce((a, b) => (b.balance < a.balance ? b : a), series[0]);

  return { start, end, opening: company.checking.balance, series, events: inWindow, low, shortfall: Math.max(0, round2(-low.balance)) };
}

/** Rho's suggestion: the shortfall plus at least a $5,000 buffer, rounded up to the next $5,000; pay on the due date. */
export function suggestedPlan(invoice: Invoice, shortfall: number): Plan {
  return { transfer_amount: Math.ceil((shortfall + 5000) / 5000) * 5000, pay_date: invoice.due };
}

export type Alert = {
  invoice: Invoice;
  days_until_due: number;
  short_by: number;
  text: string;
  schedule: { date: string; label: string }[];   // 14 days, then 5 and 3 business days before, if nothing's done
};

/** The text/email alert: goes out only when action is due (14 days before) and checking can't cover the invoice. */
export function alertFor(invoices: Invoice[], today: string): Alert | null {
  const f = forecast(invoices, null);
  const invoice = invoices.find(i => daysBetween(today, i.due) >= 0 && daysBetween(today, i.due) <= 14);
  if (!invoice || f.shortfall <= 0) return null;
  const days = daysBetween(today, invoice.due);
  return {
    invoice,
    days_until_due: days,
    short_by: f.shortfall,
    text: `A ${thousands(invoice.amount)} invoice is due in ${days} days. Checking will be ${dollars(f.shortfall)} short.`,
    schedule: [
      { date: addDays(invoice.due, -14), label: 'Alert: 14 days before' },
      { date: businessDaysBefore(invoice.due, 5), label: 'Reminder: 5 business days before, if nothing’s done' },
      { date: businessDaysBefore(invoice.due, 3), label: 'Last call: 3 business days before' },
    ],
  };
}

/** Checks an edited plan before it's saved. */
export function validatePlan(plan: Plan, invoice: Invoice, today: string): string | null {
  if (!Number.isFinite(plan.transfer_amount) || plan.transfer_amount < 0) return 'Enter a transfer amount of $0 or more.';
  if (plan.transfer_amount > DATA.company.treasury.balance) return 'Treasury doesn’t have that much.';
  if (plan.pay_date < today) return 'Pick a payment date from today onward.';
  if (plan.pay_date > invoice.due) return `Pay on or before the due date (${invoice.due}).`;
  return null;
}

function businessDaysBefore(day: string, n: number): string {
  let d = day;
  while (n > 0) {
    d = addDays(d, -1);
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (wd !== 0 && wd !== 6) n--;
  }
  return d;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
export const dollars = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
export const thousands = (n: number) => (n >= 1000 && n % 1000 === 0 ? `$${n / 1000}K` : dollars(n));
