/**
 * Reads emails and pulls out invoices: who sent it, how much, when it was issued and when it's due.
 * Mock version of what an inbox connection would do; it looks for the plain-text lines invoices usually have.
 */
import type { Email } from './data';
import { addDays } from './dates';

export type Invoice = {
  id: string;            // the email it came from
  vendor: string;
  number: string | null;
  amount: number;
  issued: string;        // YYYY-MM-DD
  terms_days: number;
  due: string;           // YYYY-MM-DD
  subject: string;
  lines: { label: string; amount: number }[];   // e.g. "Research and UX: $38,000.00"
};

const AMOUNT = /amount due:\s*\$([\d,]+(?:\.\d{2})?)/i;
const ISSUED = /invoice date:\s*([A-Za-z]+ \d{1,2}, \d{4})/i;
const TERMS = /net\s*(\d+)/i;
const NUMBER = /invoice:\s*([A-Z0-9-]+)/i;
const LINE = /^([^:\n]+):\s*\$([\d,]+\.\d{2})$/gm;

export function extractInvoice(email: Email): Invoice | null {
  const amount = email.body.match(AMOUNT);
  const issued = email.body.match(ISSUED);
  if (!amount || !issued) return null;   // not an invoice

  const terms = Number(email.body.match(TERMS)?.[1] ?? 30);
  const issuedDay = toIsoDay(issued[1]);
  return {
    id: email.id,
    vendor: email.from_name.split('·').pop()!.trim(),   // "Alex Moreno · Northbeam Studio" → "Northbeam Studio"
    number: email.body.match(NUMBER)?.[1] ?? null,
    amount: Number(amount[1].replace(/,/g, '')),
    issued: issuedDay,
    terms_days: terms,
    due: addDays(issuedDay, terms),
    subject: email.subject,
    lines: [...email.body.matchAll(LINE)]
      .filter(m => !/amount due/i.test(m[1]))
      .map(m => ({ label: m[1].trim(), amount: Number(m[2].replace(/,/g, '')) })),
  };
}

export function extractInvoices(emails: Email[]): Invoice[] {
  return emails.map(extractInvoice).filter((i): i is Invoice => i !== null);
}

function toIsoDay(text: string): string {
  const d = new Date(`${text} 12:00:00`);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
