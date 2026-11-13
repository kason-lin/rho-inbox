/**
 * "The math" behind the alert, as rows anyone can check: checking today, what goes out, what comes in,
 * and how short checking is on the due date. Used by the alert, the proof drawer and the iPhone screens.
 */
import { shortDay } from './dates';
import type { Forecast } from './forecast';

export type MathRow = { label: string; amount: number; total?: boolean; plain?: boolean };   // plain: no +/− sign

export function mathRows(before: Forecast): MathRow[] {
  const sum = (kind: string) => before.events.filter(e => e.kind === kind).reduce((t, e) => t + e.amount, 0);
  const payroll = before.events.filter(e => e.kind === 'payroll');
  const invoice = before.events.find(e => e.kind === 'invoice');
  const rows: MathRow[] = [{ label: 'Checking today', amount: before.opening, plain: true }];
  for (const p of payroll) rows.push({ label: `Payroll, ${weekday(p.date)} (Gusto)`, amount: p.amount });
  if (sum('payout')) rows.push({ label: 'Expected Stripe payouts', amount: sum('payout') });
  if (sum('bill')) rows.push({ label: 'Bills already scheduled', amount: sum('bill') });
  if (invoice) rows.push({ label: `Invoice due ${shortDay(invoice.date)}`, amount: invoice.amount });
  rows.push({ label: before.shortfall > 0 ? `Short on ${shortDay(before.low.date)}` : `Lowest, ${shortDay(before.low.date)}`, amount: before.low.balance, total: true });
  return rows;
}

/** "Fri Nov 20" */
export function weekday(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }).replace(',', '');
}

/** "+$14,000" / "−$41,200" */
export function signedUSD(n: number) {
  return `${n < 0 ? '−' : n > 0 ? '+' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
