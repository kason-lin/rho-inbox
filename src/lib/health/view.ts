/**
 * Puts the pieces together for one viewer: what's in their inbox on the demo date, the invoices found,
 * the forecast (with and without their approval), the alert, the KPIs, the "Needs you" cards and
 * "Where it goes".
 */
import { needsYou } from './cards';
import { DATA, DEMO_DATES } from './data';
import { extractInvoices, type Invoice } from './extract';
import { alertFor, forecast, obligations, suggestedPlan, type Plan } from './forecast';
import { spendByPurpose } from './spend';
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
  const { company } = DATA;
  const invoices = invoicesFor(state);
  const ready = state.date >= DEMO_DATES.alert;   // the forecast starts on the alert date
  const before = forecast(invoices, null);
  const plan: Plan | null = whatIf ?? state.approval ?? null;
  const after = plan ? forecast(invoices, plan, state.date) : null;
  const current = state.approval ? after! : before;
  const invoice = invoices[0] ?? null;
  const alert = ready ? alertFor(invoices, state.date) : null;
  const cash = company.checking.balance + company.treasury.balance;
  const { three_month_average: avg, projected } = company.burn;

  return {
    company: company.company,
    people: company.people,
    date: state.date,
    ready,
    connected: state.connected,
    data_updated: company.data_updated,
    invoice,
    invoice_email: invoiceEmail(invoice),
    obligations: obligations(invoices, state.approval),
    forecast: ready ? current : null,
    forecast_before: ready && state.approval ? before : null,   // drawn dashed after approval
    preview: whatIf ? after : null,
    suggested: invoice && before.shortfall > 0 ? suggestedPlan(invoice, before.shortfall) : null,
    gap_before: before.shortfall,
    alert,
    kpis: {
      checking: company.checking.balance,
      treasury: company.treasury.balance,
      lowest: ready ? current.low : null,
      burn: projected,
      burn_change: Math.round(((projected - avg) / avg) * 100),
      runway: Math.round((cash / projected) * 10) / 10,
      runway_was: company.burn.runway_was,
    },
    needs_you: ready ? needsYou(alert, state) : { cards: [], handled: [], others: 0 },
    spend: spendByPurpose(),
    metrics_preview: company.metrics_preview.items,
    duplicate: company.duplicate_charge,
    subscription: company.subscriptions[0],
    approval: state.approval,
    accounts: { checking: company.checking, treasury: company.treasury },
    payouts: DATA.stripe.payouts,
    payroll: company.payroll,
  };
}

/** Where the invoice came from, for the proof: sender, inbox and when it arrived (no body). */
function invoiceEmail(invoice: Invoice | null) {
  const e = invoice && DATA.inbox.emails.find(m => m.id === invoice.id);
  return e ? { from: e.from, received: e.received, to: DATA.inbox.owner, attachment: e.attachment ?? null } : null;
}

export type HealthView = ReturnType<typeof healthView>;
