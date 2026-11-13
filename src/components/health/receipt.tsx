'use client';
/** The receipt shown after approval: what moves, what's scheduled, who approved it, and the read-only note. */
import { CheckCircle2 } from 'lucide-react';
import { longDay, shortDay } from '@/lib/health/dates';
import type { HealthView } from '@/lib/health/view';
import { formatUSD } from '@/lib/format';
import connections from '@/data/business-health/connections.json';

export function Receipt({ data }: { data: HealthView }) {
  const a = data.approval;
  if (!a || !data.invoice) return null;
  const rows: [string, string][] = [
    ['Transfer', `${formatUSD(a.transfer_amount)} from Treasury ••${data.accounts.treasury.last4} to Checking ••${data.accounts.checking.last4}`],
    ['Settles', `By ${shortDay(data.date)}–${shortDay(addBusiness(data.date))} (0–2 business days)`],
    ['Payment', `${formatUSD(data.invoice.amount)} to ${data.invoice.vendor}, invoice ${data.invoice.number}, scheduled ${longDay(a.pay_date)} in Rho Bill Pay`],
    ['Approved by', `${a.approved_by} · ${new Date(a.approved_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`],
    ['Reference', a.reference],
  ];
  return (
    <div id="receipt" className="rounded-lg border border-[#c7ebe3] bg-white">
      <div className="flex items-center gap-2 border-b border-[#c7ebe3] bg-positive-subtle px-5 py-3 text-[14px] font-semibold text-positive">
        <CheckCircle2 className="size-4" /> Receipt
      </div>
      <dl className="divide-y text-[13px]">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-6 px-5 py-2.5">
            <dt className="w-28 shrink-0 text-muted-foreground">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <p className="border-t px-5 py-2.5 text-[12px] text-muted-foreground">{connections.rho_note}</p>
    </div>
  );
}

function addBusiness(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  let n = 2;
  while (n > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6) n--;
  }
  return d.toISOString().slice(0, 10);
}
