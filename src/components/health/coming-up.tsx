'use client';
/**
 * "Coming up": every payment in and out of checking before the invoice is due, each linked to where it
 * came from (Gusto, Stripe, the email). Stripe payouts are grouped, with a "What's inside" breakdown.
 */
import Link from 'next/link';
import { useState } from 'react';
import { shortDay } from '@/lib/health/dates';
import type { CashEvent } from '@/lib/health/forecast';
import type { HealthView } from '@/lib/health/view';
import { formatUSDShort } from '@/lib/format';
import { cn } from 'cn';
import { Chip } from './ui';

const signed = (n: number) => `${n < 0 ? '−' : '+'}${formatUSDShort(Math.abs(n))}`;

export function ComingUp({ data }: { data: HealthView }) {
  const [open, setOpen] = useState(false);
  const f = data.forecast!;
  const inv = data.invoice;
  const approved = !!data.approval;
  const payouts = f.events.filter(e => e.kind === 'payout');
  const others = f.events.filter(e => e.kind !== 'payout');
  // The payouts show as one row, placed by the date of the first one.
  const rows: (CashEvent | 'payouts')[] = [...others];
  if (payouts.length) rows.splice(others.filter(e => e.date <= payouts[0].date).length, 0, 'payouts');

  return (
    <ul className="divide-y text-[13px] tabular">
      {rows.map(e => e === 'payouts' ? (
        <li key="payouts">
          <button type="button" onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-[#f7f9f8]">
            <span className="w-24 shrink-0 text-muted-foreground">{shortDay(payouts[0].date)}–{shortDay(payouts[payouts.length - 1].date)}</span>
            <span className="min-w-0 flex-1">
              Stripe payouts ({payouts.length}) <span className="ml-1 text-[12px] font-semibold text-brand">{open ? 'Hide' : 'What’s inside'}</span>
              <span className="mt-0.5 block text-[12px] text-muted-foreground">Average of the last 8 weeks</span>
            </span>
            <span className="shrink-0 text-right text-positive">{signed(payouts.reduce((t, p) => t + p.amount, 0))}</span>
          </button>
          {open && (
            <div className="space-y-1.5 bg-[#f7f9f8] py-3 pr-5 pl-[123px] text-[12px] text-ink-2">
              {data.payouts.map(p => (
                <Link key={p.id} href={`/business-health/source/payout/${p.id}`} className="flex justify-between gap-4 hover:underline">
                  <span>{shortDay(p.date)} · Gross sales {formatUSDShort(p.inside.gross)} ({p.inside.charges} charges) · Stripe fees −{formatUSDShort(-p.inside.fees)} · Refunds −{formatUSDShort(-p.inside.refunds)}</span>
                  <span>{formatUSDShort(p.amount)}</span>
                </Link>
              ))}
            </div>
          )}
        </li>
      ) : (
        <li key={e.id} className={cn('flex items-start gap-3 px-5 py-3', e.kind === 'invoice' && !approved && 'bg-negative-bg/40')}>
          <span className="w-24 shrink-0 text-muted-foreground">{shortDay(e.date)}</span>
          <span className="min-w-0 flex-1">
            {e.kind === 'transfer' && <>Treasury → Checking <Chip tone="teal">Approved</Chip></>}
            {e.kind === 'payroll' && <>{data.payroll[0]?.label ?? 'Payroll'} · {data.people} people</>}
            {e.kind === 'invoice' && inv && <>{inv.vendor} <Chip tone={approved ? 'teal' : 'amber'}>{approved ? 'Scheduled' : 'From inbox'}</Chip></>}
            {e.kind === 'bill' && e.label}
            <Link href={e.source.href} className="mt-0.5 block text-[12px] text-brand hover:underline">
              {e.kind === 'transfer' && 'Settles in 0–2 business days'}
              {e.kind === 'payroll' && 'Gusto pay schedule'}
              {e.kind === 'invoice' && inv && `Invoice ${inv.number} · net ${inv.terms_days} · open the email`}
              {e.kind === 'bill' && e.source.ref}
            </Link>
          </span>
          <span className={cn('shrink-0 text-right', e.amount > 0 && 'text-positive')}>{signed(e.amount)}</span>
        </li>
      ))}
    </ul>
  );
}
