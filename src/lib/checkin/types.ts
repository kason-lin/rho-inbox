// Rho Check-in: what the engine reads (a snapshot of Rho data) and what it produces (cards).

export type Role = 'admin' | 'member' | 'account_manager';
export type AppUser = { id: string; name: string; title: string; role: Role };

export type CardType = 'payday_guard' | 'suspicious_charge' | 'subscription_review' | 'burn_change';
export type CardStatus = 'proposed' | 'approved' | 'not_now' | 'wrong';
export type Decision = 'approve' | 'not_now' | 'wrong';
export const DECISIONS = ['approve', 'not_now', 'wrong'] as const;

export type AccountId = 'checking' | 'treasury';
export const OWN_ACCOUNTS: AccountId[] = ['checking', 'treasury'];

export type Account = { id: AccountId; name: string; last4: string; balance: number; updated_at: string };
export type ScheduledPayment = { id: string; payee: string; kind: 'bill' | 'payroll'; amount: number; due_on: string; account_id: AccountId };
export type Txn = {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  method: 'card' | 'ach' | 'payroll';
  card_last4: string | null;
  card_owner: string | null;
  recurring: boolean;
  occurred_at: string;
};
export type VendorUsage = { vendor: string; last_login_at: string | null; card_owner_active: boolean; locked: boolean };
export type BurnMonth = { month: string; total: number; by_category: Record<string, number> };
export type KnownChange = { description: string; category: string; monthly_delta: number; source: string; payroll: boolean };
export type Feedback = { card_type: CardType; rule: string; vendor: string | null; kind: 'wrong' | 'not_now' };

/** Categories whose amounts count as payroll details (hidden from non-admins). */
export const PAYROLL_CATEGORIES = ['Payroll', 'Benefits & taxes'];

export type Snapshot = {
  now: Date;
  accounts: Account[];
  scheduled: ScheduledPayment[];
  transactions: Txn[];
  usage: VendorUsage[];
  burn: BurnMonth[];
  changes: KnownChange[];
  feedback: Feedback[];
  /** Cards already decided this week, so the engine doesn't suggest them again. */
  decided: { type: CardType; rule: string; vendor: string | null }[];
  cofounder: string;
};

export type ProofItem = {
  label: string;
  detail?: string;
  amount?: number | null;
  date?: string;
  payroll?: boolean;        // redacted for non-admins
  emphasis?: boolean;
};
export type ProofSection = { title: string; items: ProofItem[] };

export type PreparedAction =
  | { kind: 'transfer'; from: AccountId; to: AccountId; amount: number; date: string; label: string }
  | { kind: 'dispute'; vendor: string; amount: number; transaction_id: string; card_last4: string | null; reason: string; label: string }
  | { kind: 'lock_card'; vendor: string; card_last4: string | null; card_owner: string | null; monthly_cost: number; label: string }
  | { kind: 'share'; to: string; label: string };

export type CardDraft = {
  key: string;              // type|rule|vendor: stable identity within a week
  type: CardType;
  rule: string;
  vendor: string | null;
  urgent: boolean;
  monthly_impact: number;
  runway_days: number | null;
  title: string;
  question: string | null;
  why: string;
  proof: ProofSection[];
  action: PreparedAction | null;
};

export type RankedCard = CardDraft & { rank: number };

export type Briefing = {
  cards: RankedCard[];
  others: string[];         // "We checked 14 other things. They look fine."
  burn: { average: number; projected: number; per_day: number };
  runway_months: number;
  total_cash: number;
  data_as_of: string;
};

export type CheckinCard = RankedCard & {
  id: string;
  week_of: string;
  status: CardStatus;
  data_as_of: string;
  inbox_event_id: string | null;
  decided_by: string | null;
  decided_at: string | null;
};
