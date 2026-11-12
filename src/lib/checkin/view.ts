import type { AppUser, CheckinCard, ProofSection } from './types';
import { canApprove } from './decide';

export type CardView = CheckinCard & { can_approve: boolean; redacted: boolean };

/** Role-based view: non-admin teammates see the cards, but payroll amounts and names are hidden. */
export function viewCard(card: CheckinCard, viewer: AppUser): CardView {
  const hide = viewer.role === 'member';
  const proof: ProofSection[] = hide
    ? card.proof.map(s => ({
        ...s,
        items: s.items.map(i => (i.payroll ? { ...i, label: i.label.includes('raise') || i.label.includes('hires') ? 'Payroll change' : i.label, detail: 'Hidden for your role', amount: null } : i)),
      }))
    : card.proof;
  const redacted = hide && card.proof.some(s => s.items.some(i => i.payroll));
  return { ...card, proof, can_approve: canApprove(viewer) && card.status === 'proposed', redacted };
}
