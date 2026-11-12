export const SOURCES = ['cards', 'bill_pay', 'invoicing', 'treasury', 'approvals'] as const;
export type Source = (typeof SOURCES)[number];

export const PRIORITIES = ['needs_action', 'fyi'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['unread', 'read', 'done', 'snoozed'] as const;
export type Status = (typeof STATUSES)[number];

export const ACTIONS = ['approve', 'pay', 'dispute'] as const;
export type Action = (typeof ACTIONS)[number];

export type EventMeta = {
  reason?: string;            // why priority rules flagged it
  cardholder?: string;
  category?: string;
  typical_amount?: number;    // cardholder's usual charge size
  new_category?: boolean;     // first charge in this category
  balance?: number;           // treasury: operating cash
  monthly_burn?: number;
  invoice_number?: string;
  requested_by?: string;
  [key: string]: unknown;
};

export type InboxEvent = {
  id: string;
  source: Source;
  type: string;
  title: string;
  summary: string | null;
  amount: number | null;
  counterparty: string | null;
  priority: Priority;
  status: Status;
  thread_id: string;
  action_type: Action | null;
  due_at: string | null;
  snooze_until: string | null;
  meta: EventMeta;
  created_at: string;
};

/** What generators produce before the database assigns id / defaults. */
export type NewEvent = Omit<InboxEvent, 'id' | 'priority' | 'status' | 'snooze_until' | 'thread_id' | 'created_at'> & {
  thread_id?: string;
  status?: Status;
  created_at?: string;
};

export type InboxThread = {
  thread_id: string;
  source: Source;
  head: InboxEvent;          // latest event; drives how the row looks
  events: InboxEvent[];      // oldest first, for the timeline
  priority: Priority;
  reason: string | null;
  status: Status;
  actions: Action[];         // what the row's buttons can do right now
};

export const SOURCE_LABELS: Record<Source, string> = {
  cards: 'Cards',
  bill_pay: 'Bill Pay',
  invoicing: 'Invoicing',
  treasury: 'Treasury',
  approvals: 'Approvals',
};
