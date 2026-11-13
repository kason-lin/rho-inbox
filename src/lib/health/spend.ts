/**
 * "Where it goes": each AI/cloud/tool bill split by purpose (building, running, operations, unassigned).
 * The Claude bill is built from usage records tagged by project and checked against the card charge;
 * the other providers come from other-spend.json. The match check compares each provider's own report
 * with what Rho actually paid.
 */
import otherSpend from '@/data/business-health/other-spend.json';
import { DATA, type Purpose } from './data';

export type SpendPurpose = Purpose | 'ops' | 'unassigned';
export type Slice = { purpose: SpendPurpose; label: string; amount: number };

export type SpendSplit = {
  claude: {
    provider: string;
    month: string;
    charge: { amount: number; date: string; card_last4: string; card_owner: string; description: string };
    total_from_usage: number;
    matches_charge: boolean;
    label_rule: string;
    purposes: { purpose: Purpose; label: string; amount: number; share: number; projects: { name: string; amount: number }[] }[];
  };
  providers: { name: string; total: number; slices: Slice[] }[];
  coverage: number;                                   // share of spend assigned to a purpose
  match: { name: string; reported: number | null; paid: number; difference: number }[];
};

const LABELS = otherSpend.purposes as Record<SpendPurpose, string>;

export function spendByPurpose(): SpendSplit {
  const { ai } = DATA;
  const total = sum(ai.records.map(r => r.amount));
  const order: Purpose[] = ['building', 'running'];
  const purposes = order.map(purpose => {
    const records = ai.records.filter(r => r.purpose === purpose);
    const byProject = new Map<string, number>();
    for (const r of records) byProject.set(r.project, (byProject.get(r.project) ?? 0) + r.amount);
    const amount = sum(records.map(r => r.amount));
    return {
      purpose,
      label: ai.purposes[purpose],
      amount,
      share: total ? amount / total : 0,
      projects: [...byProject].map(([name, amt]) => ({ name, amount: amt })).sort((a, b) => b.amount - a.amount),
    };
  });

  const claudeRow = { name: 'Claude (Anthropic)', total, slices: purposes.map(p => ({ purpose: p.purpose as SpendPurpose, label: LABELS[p.purpose], amount: p.amount })) };
  const others = otherSpend.providers.map(p => ({
    name: p.name,
    total: sum(p.slices.map(s => s.amount)),
    slices: p.slices.map(s => ({ purpose: s.purpose as SpendPurpose, label: LABELS[s.purpose as SpendPurpose], amount: s.amount })),
  }));
  const providers = [claudeRow, ...others];
  const all = sum(providers.map(p => p.total));
  const assigned = sum(providers.flatMap(p => p.slices.filter(s => s.purpose !== 'unassigned').map(s => s.amount)));

  return {
    claude: {
      provider: ai.provider,
      month: ai.month,
      charge: ai.card_charge,
      total_from_usage: total,
      matches_charge: Math.abs(total - ai.card_charge.amount) < 0.005,
      label_rule: ai.label_rule,
      purposes,
    },
    providers,
    coverage: all ? assigned / all : 0,
    match: [
      { name: 'Anthropic', reported: ai.reported_by_provider, paid: ai.card_charge.amount },
      ...otherSpend.providers.filter(p => p.reported !== null).map(p => ({ name: p.name, reported: p.reported as number, paid: p.paid })),
    ].map(m => ({ ...m, difference: m.reported === null ? 0 : round2(m.paid - m.reported) })),
  };
}

const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + b, 0));
const round2 = (n: number) => Math.round(n * 100) / 100;
