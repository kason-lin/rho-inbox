/**
 * Loop Labs: the hypothetical seed-stage company from the Check-in spec (6 people).
 * Numbers match the spec exactly:
 *   checking $11,800 · treasury $1,032,200 · total cash $1,044,000
 *   payroll Friday $16,000 → $4,200 short → suggest moving $5,000
 *   a $250/mo tool nobody has signed in to for 60 days
 *   burn $87,000 → $97,440 (+12%) from 2 new hires and a 10% raise → runway 12.0 → 10.7 months
 * Used by both the seed script and the engine tests, so the demo and the tests can't drift apart.
 */
import { isoDay } from './engine';
import type { Account, AppUser, BurnMonth, KnownChange, ScheduledPayment, Snapshot, Txn, VendorUsage } from './types';

const DAY = 86_400_000;
const uuid = () => crypto.randomUUID();

export const COMPANY = 'Loop Labs';

export const USERS: AppUser[] = [
  { id: 'kason', name: 'Kason Lin', title: 'Founder & CEO', role: 'admin' },
  { id: 'jordan', name: 'Jordan Ellis', title: 'Co-founder & CTO', role: 'admin' },
  { id: 'ana', name: 'Ana Costa', title: 'Operations', role: 'member' },
  { id: 'dana', name: 'Dana Okafor', title: 'Rho account manager', role: 'account_manager' },
];

export const TEAM = [
  { name: 'Kason Lin', card: '4102', typical: 180 },
  { name: 'Jordan Ellis', card: '3318', typical: 140 },
  { name: 'Ana Costa', card: '5520', typical: 120 },
  { name: 'Priya Shah', card: '7731', typical: 90 },
  { name: 'Sam Rivera', card: '4417', typical: 60 },
  { name: 'Leo Martins', card: '6094', typical: 75 },
] as const;

// Recurring tools: [vendor, monthly price (oldest → newest), owner index, day offset, last login (days ago) | null]
const TOOLS: [string, number[], number, number, number | null][] = [
  ['Google Workspace', [86.4, 86.4, 86.4], 0, 2, 0],
  ['Slack', [52.5, 52.5, 52.5], 0, 3, 0],
  ['Figma', [180, 180, 180], 3, 4, 1],
  ['Notion', [60, 60, 60], 2, 5, 0],
  ['GitHub', [84, 84, 84], 1, 6, 0],
  ['Linear', [48, 48, 48], 1, 7, 0],
  ['Vercel', [120, 120, 120], 1, 8, 2],
  ['Amazon Web Services', [1231.9, 1262.44, 1284.17], 1, 9, null],
  ['Zoom', [66.63, 66.63, 66.63], 2, 10, 3],
  ['1Password', [47.88, 47.88, 47.88], 1, 11, 0],
  ['Loom', [75, 75, 75], 0, 12, 6],
  ['Mixpanel', [250, 250, 250], 4, 13, 60],   // the unused one
];

// One-off card spend: [vendor, category, amount, owner index, days ago]. All small and spread out.
const ONE_OFFS: [string, string, number, number, number][] = [
  ['Sweetgreen', 'Meals', 48.21, 0, 1],
  ['Uber', 'Travel', 34.6, 2, 2],
  ['Amazon Business', 'Office supplies', 212.38, 2, 4],
  ['Blue Bottle Coffee', 'Meals', 27.5, 3, 6],
  ['Delta Air Lines', 'Travel', 418.2, 0, 9],
  ['Lyft', 'Travel', 22.75, 4, 11],
  ['Staples', 'Office supplies', 96.14, 2, 16],
  ['DoorDash', 'Meals', 73.9, 1, 19],
  ['Marriott', 'Lodging', 389.0, 0, 23],
  ['Apple Store', 'Equipment', 129.0, 5, 27],
  ['Sweetgreen', 'Meals', 51.84, 3, 33],
  ['Uber', 'Travel', 41.18, 0, 38],
  ['WeWork Day Pass', 'Office', 35.0, 4, 45],
  ['Amazon Business', 'Office supplies', 148.62, 5, 52],
  ['United Airlines', 'Travel', 362.4, 1, 58],
  ['Chipotle', 'Meals', 64.3, 2, 66],
  ['Best Buy', 'Equipment', 249.99, 3, 74],
  ['Lyft', 'Travel', 18.4, 5, 83],
];

// 3-month burn history; totals average exactly $87,000, and the latest month is $87,000.
const BURN: [number, Record<string, number>][] = [
  [86_100, { Payroll: 32_000, 'Benefits & taxes': 7_400, Contractors: 24_000, 'Rent & office': 4_800, 'Software & cloud': 4_132, 'Legal & accounting': 3_600, 'Travel & meals': 2_968, Other: 7_200 }],
  [87_900, { Payroll: 32_000, 'Benefits & taxes': 7_400, Contractors: 24_000, 'Rent & office': 4_800, 'Software & cloud': 4_212, 'Legal & accounting': 4_200, 'Travel & meals': 3_688, Other: 7_600 }],
  [87_000, { Payroll: 32_000, 'Benefits & taxes': 7_400, Contractors: 24_000, 'Rent & office': 4_800, 'Software & cloud': 4_264, 'Legal & accounting': 3_850, 'Travel & meals': 2_686, Other: 8_000 }],
];

export const CHANGES: KnownChange[] = [
  { description: '2 new hires (part-time engineers) starting Dec 1', category: 'Payroll', monthly_delta: 9_240, source: 'payroll', payroll: true },
  { description: '10% raise for Priya Shah in a signed contract', category: 'Payroll', monthly_delta: 1_200, source: 'contract_email', payroll: true },
];

export type LoopLabsData = Omit<Snapshot, 'now' | 'feedback' | 'decided'> & { users: AppUser[] };

export function buildLoopLabs(now: Date): LoopLabsData {
  const ago = (days: number, hours = 10) => new Date(now.getTime() - days * DAY - hours * 3_600_000).toISOString();
  const inDays = (days: number) => isoDay(new Date(now.getTime() + days * DAY));

  const accounts: Account[] = [
    { id: 'checking', name: 'Checking', last4: '4821', balance: 11_800, updated_at: new Date(now.getTime() - 14 * 60_000).toISOString() },
    { id: 'treasury', name: 'Treasury', last4: '7310', balance: 1_032_200, updated_at: new Date(now.getTime() - 14 * 60_000).toISOString() },
  ];

  const toFriday = ((5 - now.getDay() + 7) % 7) || 7;
  const scheduled: ScheduledPayment[] = [
    { id: uuid(), payee: 'Gusto payroll run', kind: 'payroll', amount: 16_000, due_on: inDays(toFriday), account_id: 'checking' },
    { id: uuid(), payee: 'Gusto payroll run', kind: 'payroll', amount: 16_000, due_on: inDays(toFriday + 14), account_id: 'checking' },
    { id: uuid(), payee: 'Cooley LLP', kind: 'bill', amount: 3_850, due_on: inDays(18), account_id: 'checking' },
    { id: uuid(), payee: 'WeWork', kind: 'bill', amount: 4_800, due_on: inDays(19), account_id: 'checking' },
  ];

  const transactions: Txn[] = [];
  for (const [vendor, prices, owner, offset] of TOOLS) {
    prices.forEach((amount, i) => {
      const person = TEAM[owner];
      transactions.push({
        id: uuid(), vendor, amount, category: vendor === 'Amazon Web Services' ? 'Cloud' : 'Software',
        method: 'card', card_last4: person.card, card_owner: person.name, recurring: true,
        occurred_at: ago(offset + (prices.length - 1 - i) * 30),
      });
    });
  }
  for (const [vendor, category, amount, owner, days] of ONE_OFFS) {
    const person = TEAM[owner];
    transactions.push({ id: uuid(), vendor, amount, category, method: 'card', card_last4: person.card, card_owner: person.name, recurring: false, occurred_at: ago(days, 6) });
  }
  for (const days of [6, 21, 36, 51, 66, 81]) {
    transactions.push({ id: uuid(), vendor: 'Gusto payroll run', amount: 16_000, category: 'Payroll', method: 'payroll', card_last4: null, card_owner: null, recurring: true, occurred_at: ago(days, 2) });
  }

  const usage: VendorUsage[] = TOOLS.filter(t => t[4] !== null).map(([vendor, , , , login]) => ({
    vendor,
    last_login_at: ago(login as number, vendor === 'Mixpanel' ? 3 : 1),
    card_owner_active: true,
    locked: false,
  }));

  const burn: BurnMonth[] = BURN.map(([total, by_category], i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (BURN.length - i), 1);
    return { month: isoDay(d), total, by_category };
  });

  return { users: USERS, accounts, scheduled, transactions, usage, burn, changes: CHANGES, cofounder: 'Jordan Ellis' };
}

export function snapshotFrom(data: LoopLabsData, now: Date): Snapshot {
  const { users: _users, ...rest } = data;
  return { ...rest, now, feedback: [], decided: [] };
}
