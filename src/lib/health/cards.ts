/**
 * "Needs you": at most 3 open cards, urgent first. Cards the founder already acted on stay visible as
 * "Handled" (crossed out), and the next card moves up.
 *   money_owed    the $55K invoice (Act, urgent)
 *   subscription  a $50/mo tool nobody uses, on a card whose owner left (Act, pure waste)
 *   spend         where the Claude bill goes (See)
 *   duplicate     Figma charged twice; appears once the invoice is handled (Act, urgent)
 */
import { DATA } from './data';
import { shortDay } from './dates';
import { dollars, thousands, type Alert } from './forecast';
import { spendByPurpose } from './spend';
import type { DemoState } from './state';

export type HealthCard = {
  id: string;
  type: 'money_owed' | 'subscription' | 'spend' | 'duplicate';
  mode: 'Act' | 'See';
  urgent: boolean;
  label: string;          // the chip, e.g. "Act · Due in 14 days"
  title: string;
  why: string;            // one line under the title
  status: 'open' | 'handled';
  handled_text: string | null;
};

export function needsYou(alert: Alert | null, state: DemoState): { cards: HealthCard[]; handled: HealthCard[]; others: number } {
  const { company } = DATA;
  const all: HealthCard[] = [];
  const approved = !!state.approval;

  if (alert) {
    all.push({
      id: 'money-owed',
      type: 'money_owed',
      mode: 'Act',
      urgent: true,
      label: `Act · Due in ${alert.days_until_due} days`,
      title: `${thousands(alert.invoice.amount)} invoice from ${alert.invoice.vendor} due ${shortDay(alert.invoice.due)}. Checking will be ${dollars(alert.short_by)} short.`,
      why: 'Found in your inbox · not in Rho Bills yet',
      status: approved ? 'handled' : 'open',
      handled_text: approved && state.approval
        ? `${thousands(alert.invoice.amount)} ${alert.invoice.vendor} invoice: ${dollars(state.approval.transfer_amount)} set aside, payment scheduled for ${shortDay(state.approval.pay_date)}`
        : null,
    });
  }

  if (approved) {
    const d = company.duplicate_charge;
    const days = Math.round((Date.parse(d.charges[1]) - Date.parse(d.charges[0])) / 86_400_000);
    const done = state.handled[d.id] === 'disputed';
    all.push({
      id: d.id,
      type: 'duplicate',
      mode: 'Act',
      urgent: true,
      label: 'Act · Duplicate charge · new',
      title: `${d.vendor} charged ${dollars(d.amount)} twice in ${days} days`,
      why: `Card ••${d.card_last4} · ${shortDay(d.charges[0])} and ${shortDay(d.charges[1])} · ${d.evidence}`,
      status: done ? 'handled' : 'open',
      handled_text: done ? `Dispute sent: ${d.vendor} duplicate charge, ${dollars(d.amount)}` : null,
    });
  }

  for (const s of company.subscriptions) {
    const done = state.handled[s.id] === 'cancelled';
    all.push({
      id: s.id,
      type: 'subscription',
      mode: 'Act',
      urgent: false,
      label: 'Act · Pure waste',
      title: `${dollars(s.monthly)}/mo ${s.vendor} plan, 0 logins in ${s.last_login_days} days`,
      why: `Card ••${s.card_last4} · owner left in ${s.owner_left} · ${s.source}`,
      status: done ? 'handled' : 'open',
      handled_text: done ? `${s.vendor} cancelled and card locked · saves ${dollars(s.monthly * 12)} a year` : null,
    });
  }

  const spend = spendByPurpose();
  const claude = spend.claude;
  all.push({
    id: 'spend',
    type: 'spend',
    mode: 'See',
    urgent: false,
    label: 'See · Spend by purpose',
    title: `Claude bill ${thousands(claude.charge.amount)}: ${claude.purposes.map(p => `${thousands(p.amount)} ${p.purpose === 'building' ? 'building' : 'running the product'}`).join(', ')}`,
    why: 'From Anthropic usage data, matched to the card charge',
    status: 'open',
    handled_text: null,
  });

  const visible = all.filter(c => !state.muted.includes(c.id));
  const open = visible.filter(c => c.status === 'open').sort((a, b) => Number(b.urgent) - Number(a.urgent)).slice(0, 3);
  const handled = visible.filter(c => c.status === 'handled');
  return { cards: open, handled, others: company.other_checks };
}
