/**
 * Splits the AI bill by purpose: money spent building the product vs. running it for customers,
 * with the projects behind each slice. Also checks the slices add up to the card charge exactly.
 */
import { DATA, type Purpose } from './data';

export type SpendSplit = {
  provider: string;
  month: string;
  charge: { amount: number; date: string; card_last4: string; card_owner: string; description: string };
  total_from_usage: number;
  matches_charge: boolean;
  purposes: { purpose: Purpose; label: string; amount: number; share: number; projects: { name: string; amount: number }[] }[];
};

export function spendByPurpose(): SpendSplit {
  const { ai } = DATA;
  const order: Purpose[] = ['building', 'running'];
  const total = sum(ai.records.map(r => r.amount));

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

  return {
    provider: ai.provider,
    month: ai.month,
    charge: ai.card_charge,
    total_from_usage: total,
    matches_charge: Math.abs(total - ai.card_charge.amount) < 0.005,
    purposes,
  };
}

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;
