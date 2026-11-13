'use client';
/**
 * Story beat 2: on Nov 18 (14 days before the invoice is due) Rho sends one alert, as a text and an
 * email. Rho only alerts when a decision is due; Review opens Business health on the card.
 */
import { BellOff, ChevronLeft, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { PresenterBar } from '@/components/health/presenter-bar';
import { useHealth } from '@/components/health/use-health';
import { longDay, shortDay } from '@/lib/health/dates';

export default function AlertPage() {
  const { data } = useHealth();
  const alert = data?.alert;

  return (
    <div className="min-h-screen bg-[#eef1f0] p-3">
      <PresenterBar className="mb-6" />
      {data && !alert && (
        <div className="mx-auto mt-16 max-w-md rounded-xl border bg-white p-8 text-center">
          <BellOff className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-[15px] font-semibold">{data.approval ? 'All set: the invoice is covered and scheduled.' : 'No alert yet.'}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {data.approval ? 'Rho stops alerting once the decision is made.' : 'Rho only alerts when action is due: 14 days before the due date. Use the demo date control to jump to Nov 18.'}
          </p>
        </div>
      )}

      {alert && (
        <div className="mx-auto grid max-w-5xl items-start gap-8 lg:grid-cols-[340px_1fr]">
          {/* Text message on a phone */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink-2"><MessageSquare className="size-3.5" /> As a text</div>
            <div className="rounded-[44px] border-[10px] border-[#151716] bg-white p-4 shadow-xl">
              <div className="mx-auto mb-4 h-5 w-24 rounded-full bg-[#151716]" />
              <div className="flex items-center gap-2 border-b pb-3">
                <ChevronLeft className="size-5 text-[#007aff]" />
                <span className="grid size-8 place-items-center rounded-full bg-[#151716] font-wordmark text-white">R</span>
                <span className="text-[13px] font-semibold">Rho</span>
              </div>
              <div className="py-6 text-center text-[11px] text-muted-foreground">{longDay(data.date)} 8:02 AM</div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-[#e9e9eb] px-3.5 py-2.5 text-[14px] leading-snug">
                {alert.text} Review: <Link href="/business-health" className="text-[#007aff] underline">rho.co/r/bh-55k</Link>
              </div>
              <div className="h-40" />
            </div>
          </div>

          {/* The same alert by email */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-ink-2"><Mail className="size-3.5" /> As an email</div>
            <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
              <div className="border-b px-6 py-4">
                <div className="text-[16px] font-semibold">Action needed: {alert.text.split('.')[0].replace('A ', '')}</div>
                <div className="mt-1 text-[12px] text-muted-foreground">Rho Business health · to Kason Lin · {shortDay(data.date)}, 8:02 AM</div>
              </div>
              <div className="px-6 py-6">
                <p className="font-wordmark text-[26px] leading-none">Rho</p>
                <p className="mt-5 text-[18px] font-semibold">{alert.text.split('. ')[0]}.</p>
                <p className="mt-1 text-[15px]">{alert.text.split('. ')[1]}</p>
                <p className="mt-4 text-[13px] text-ink-2">
                  {alert.invoice.vendor} sent invoice {alert.invoice.number} on {shortDay(alert.invoice.issued)} with net {alert.invoice.terms_days} terms. It’s due {longDay(alert.invoice.due)}.
                  We’ve prepared a fix you can approve in one tap.
                </p>
                <Link href="/business-health" className="mt-5 inline-flex h-10 items-center rounded-md bg-mint px-5 text-[14px] font-semibold text-mint-ink hover:bg-mint-hover">
                  Review
                </Link>
                <p className="mt-6 border-t pt-4 text-[11px] text-muted-foreground">
                  Rho alerts only when a decision is due: {alert.schedule.map(s => `${shortDay(s.date)} (${s.label.split(':')[0].toLowerCase()})`).join(', ')}. Sample data; prototype alert, not sent by Rho.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
