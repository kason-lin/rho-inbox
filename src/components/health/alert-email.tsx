'use client';
/**
 * The alert email Rho sends on Nov 18, as an HTML email (black Rho header, the math, one button).
 * Shown in the mailbox (where it arrives) and on the Alert page.
 */
import Link from 'next/link';
import { shortDay } from '@/lib/health/dates';
import { mathRows } from '@/lib/health/math';
import type { HealthView } from '@/lib/health/view';
import { formatUSDShort } from '@/lib/format';
import { Chip, MathTable } from './ui';

export function AlertEmailBody({ data }: { data: HealthView }) {
  const alert = data.alert;
  const before = data.forecast_before ?? data.forecast;
  if (!alert || !before) return null;
  const plan = data.suggested ?? (data.approval ? { transfer_amount: data.approval.transfer_amount, pay_date: data.approval.pay_date } : null);
  return (
    <div className="mx-auto max-w-[560px] overflow-hidden rounded-lg bg-white">
      <div className="flex items-center justify-between bg-[#0f0f10] px-6 py-4">
        <span className="font-wordmark text-[24px] leading-none text-[#f5f8f8]">Rho</span>
        <span className="font-mono text-[10.5px] tracking-[0.06em] text-[#6af3d9] uppercase">Business health</span>
      </div>
      <div className="space-y-4 px-6 py-6 text-[14px] text-[#1b2122]">
        <p>Hi {data.invoice_email ? 'Kason' : 'there'},</p>
        <Chip tone="red">Needs you · due {shortDay(alert.invoice.due)}</Chip>
        <h3 className="text-[20px] leading-snug font-normal tracking-[-0.01em] text-[#0c0f0f]">
          {alert.invoice.vendor}’s {formatUSDShort(alert.invoice.amount)} invoice is due in {alert.days_until_due} days. Checking will be {formatUSDShort(alert.short_by)} short.
        </h3>
        <MathTable rows={mathRows(before)} />
        {plan && (
          <p className="text-[#364244]">
            Suggested fix: set aside {formatUSDShort(plan.transfer_amount)} from treasury now (it settles in 0–2 business days) and schedule the payment for {shortDay(plan.pay_date)}. One approval does both.
          </p>
        )}
        <div className="pt-1 text-center">
          <Link href="/business-health" className="inline-flex h-11 items-center rounded-lg bg-[#0c0f0f] px-6 text-[14px] text-[#f5f8f8] hover:bg-[#1b2122]">Review in Rho</Link>
          <div className="mt-3"><Link href={`/mailbox?email=${alert.invoice.id}`} className="text-[13px] text-[#007a6a] underline">See the original invoice email</Link></div>
        </div>
        <p className="text-[#364244]">— Rho</p>
      </div>
      <div className="border-t border-[#dfe7e8] px-6 py-4 text-[11px] leading-relaxed text-[#7f9195]">
        Found in {data.invoice_email?.to} (read-only). You get this because a decision is due, not on a schedule. Reminder in 5 business days if nothing’s done.
        <div className="mt-2"><span className="underline">Manage alerts</span> · <span className="underline">Switch to text</span></div>
        <div className="mt-2">Sample data. Prototype alert, not sent by Rho.</div>
      </div>
    </div>
  );
}
