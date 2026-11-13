/**
 * Business health sample data. Everything the feature shows comes from the JSON files in
 * src/data/business-health/: edit a number there and the whole demo follows.
 */
import aiUsage from '@/data/business-health/ai-usage.json';
import company from '@/data/business-health/company.json';
import connections from '@/data/business-health/connections.json';
import inbox from '@/data/business-health/inbox.json';
import stripe from '@/data/business-health/stripe-payouts.json';

export type Email = {
  id: string;
  received: string;
  from_name: string;
  from: string;
  subject: string;
  body: string;
  attachment?: string;
};

export type Purpose = 'building' | 'running';
export type UsageRecord = { id: string; project: string; purpose: Purpose; amount: number; period: string };

export const DATA = {
  company,
  stripe,
  inbox: inbox as { owner: string; emails: Email[] },
  ai: aiUsage as typeof aiUsage & { records: UsageRecord[]; purposes: Record<Purpose, string> },
  connections,
};

/** The two moments the demo jumps between. */
export const DEMO_DATES = {
  invoiceArrives: '2026-10-03',
  alert: '2026-11-18',
} as const;
