/**
 * Puts the pieces together for one viewer: what's in their inbox on the demo date, the invoices found,
 * the obligations, the forecast (with and without their approval), the alert and the "Needs you" cards.
 */
import { needsYou, whereItGoes } from './cards';
import { DATA, DEMO_DATES } from './data';
import { extractInvoices, type Invoice } from './extract';
import { alertFor, forecast, obligations, suggestedPlan, type Plan } from './forecast';
import type { DemoState } from './state';

export function visibleEmails(state: DemoState) {
  // An email is in the inbox once its received date has passed on the demo calendar.
  return DATA.inbox.emails
    .filter(e => e.received.slice(0, 10) <= state.date)
    .sort((a, b) => b.received.localeCompare(a.received));
}

export function invoicesFor(state: DemoState): Invoice[] {
  return extractInvoices(visibleEmails(state));
}

export function healthView(state: DemoState, whatIf?: Plan) {
  const invoices = invoicesFor(state);
  const ready = state.date >= DEMO_DATES.alert;   // the forecast starts on the alert date
  const before = forecast(invoices, null);
  const plan: Plan | null = whatIf ?? state.approval ?? null;
  const after = plan ? forecast(invoices, plan, state.date) : null;
  const invoice = invoices[0] ?? null;
  const alert = ready ? alertFor(invoices, state.date) : null;

  return {
    company: DATA.company.company,
    date: state.date,
    ready,
    connected: state.connected,
    invoice,
    obligations: obligations(invoices, state.approval),
    forecast: ready ? (state.approval ? after! : before) : null,
    preview: whatIf ? after : null,
    suggested: invoice && before.shortfall > 0 ? suggestedPlan(invoice, before.shortfall) : null,
    gap_before: before.shortfall,
    alert,
    needs_you: ready ? needsYou(alert, !!state.approval, state.muted) : { cards: [], others: 0 },
    where_it_goes: whereItGoes(),
    approval: state.approval,
    accounts: { checking: DATA.company.checking, treasury: DATA.company.treasury },
    payouts: DATA.stripe.payouts,
  };
}

export type HealthView = ReturnType<typeof healthView>;
