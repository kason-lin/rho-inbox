'use client';
/**
 * Story beat 2: on Nov 18, 14 days before the invoice is due, Rho sends one alert (email or text, the
 * founder picks). It goes out only because a decision is due. Review opens the Business health tab.
 */
import { BellOff, ChevronLeft, Mail, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Btn, Chip, Eyebrow, MathTable } from '@/components/health/ui';
import { useHealth } from '@/components/health/use-health';
import { longDay, shortDay } from '@/lib/health/dates';
import { mathRows } from '@/lib/health/math';
import { formatUSDShort } from '@/lib/format';
import { cn } from 'cn';

export default function AlertPage() {
  const { data } = useHealth();
  const [channel, setChannel] = useState<'email' | 'text'>('email');
  const alert = data?.alert;
  const before = data?.forecast_before ?? data?.forecast;
  const plan = data?.suggested ?? (data?.approval ? { transfer_amount: data.approval.transfer_amount, pay_date: data.approval.pay_date } : null);
  const k = (n: number) => formatUSDShort(n).replace(',000', 'K');

  return (
    <div className="min-h-screen bg-[#eef1f0] p-3">
      <PresenterBar className="mb-6" />
      {data && !alert && (
        <div className="mx-auto mt-16 max-w-md rounded-xl border bg-white p-8 text-center">
          <BellOff className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 text-[15px] font-semibold">No alert yet.</p>
          <p className="mt-1 text-[13px] text-muted-foreground">Rho only alerts when a decision is due: 14 days before the due date. Use the demo date control to jump to Nov 18.</p>
        </div>
      )}

      {alert && before && (
        <div className="mx-auto max-w-5xl">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow className="text-brand">{longDay(data.date)} · 8:00 AM · {alert.days_until_due} days before the due date</Eyebrow>
              <h1 className="mt-1 max-w-xl text-[22px] leading-tight font-semibold tracking-tight">Rho found the invoice. The founder gets one alert, not a digest.</h1>
              <p className="mt-1 text-[13px] text-muted-foreground">Sent only because a decision is due. The founder picks email or text.</p>
            </div>
            <div className="flex gap-2">
              <div className="flex rounded-md border bg-white p-0.5">
                {(['email', 'text'] as const).map(c => (
                  <button key={c} type="button" onClick={() => setChannel(c)} className={cn('flex items-center gap-1.5 rounded px-3 py-1 text-[12px] font-semibold', channel === c ? 'bg-[#151716] text-white' : 'text-ink-2 hover:bg-[#f2f5f4]')}>
                    {c === 'email' ? <Mail className="size-3.5" /> : <MessageSquare className="size-3.5" />} {c === 'email' ? 'Email' : 'Text'}
                  </button>
                ))}
              </div>
              <Link href="/business-health"><Btn variant="mint">Review in Rho →</Btn></Link>
            </div>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
            {channel === 'email' ? (
              <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
                <div className="border-b bg-[#f7f9f8] px-6 py-3 text-[12px] text-muted-foreground">
                  From: Rho &lt;alerts@rho.co&gt; · To: Kason Lin · Subject: <span className="text-foreground">{alert.text.split('.')[0]}</span>
                </div>
                <div className="space-y-4 px-6 py-6">
                  <p className="font-wordmark text-[26px] leading-none">Rho</p>
                  <Chip tone="red">Needs you · due {shortDay(alert.invoice.due)}</Chip>
                  <h2 className="text-[18px] leading-snug font-semibold">
                    {alert.invoice.vendor}’s {formatUSDShort(alert.invoice.amount)} invoice is due in {alert.days_until_due} days. Checking will be {formatUSDShort(alert.short_by)} short.
                  </h2>
                  <MathTable rows={mathRows(before)} />
                  {plan && (
                    <p className="text-[13px] text-ink-2">
                      Suggested fix: set aside {formatUSDShort(plan.transfer_amount)} from treasury now (it settles in 0–2 business days) and schedule the payment for {shortDay(plan.pay_date)}. One approval does both.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Link href="/business-health"><Btn variant="mint">Review in Rho</Btn></Link>
                    <Link href={`/mailbox?email=${alert.invoice.id}`}><Btn>See the invoice</Btn></Link>
                  </div>
                  <p className="border-t pt-4 text-[12px] text-muted-foreground">
                    Found in {data.invoice_email?.to} (read-only). You get this because a decision is due, not on a schedule.
                    Reminder in 5 business days if nothing’s done. Sample data; prototype alert, not sent by Rho.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-[320px] rounded-[44px] border-[10px] border-[#151716] bg-white p-4 shadow-xl">
                <div className="mx-auto mb-4 h-5 w-24 rounded-full bg-[#151716]" />
                <div className="flex items-center gap-2 border-b pb-3">
                  <ChevronLeft className="size-5 text-[#007aff]" />
                  <span className="grid size-8 place-items-center rounded-full bg-[#151716] font-wordmark text-white">R</span>
                  <span className="text-[13px] font-semibold">Rho · Text message</span>
                </div>
                <div className="py-5 text-center text-[11px] text-muted-foreground">{longDay(data.date)} 8:00 AM</div>
                <div className="space-y-2">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-[#e9e9eb] px-3.5 py-2.5 text-[14px] leading-snug">
                    Rho: {alert.invoice.vendor}’s {formatUSDShort(alert.invoice.amount)} invoice is due {shortDay(alert.invoice.due)}. Checking will be {formatUSDShort(alert.short_by)} short after Friday’s payroll.
                  </div>
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-[#e9e9eb] px-3.5 py-2.5 text-[14px] leading-snug">
                    Set aside {plan ? k(plan.transfer_amount) : ''} from treasury and schedule the payment? Review: <Link href="/business-health" className="text-[#007aff] underline">rho.co/bh/7Q2</Link>
                  </div>
                </div>
                <div className="h-40" />
              </div>
            )}

            <div className="rounded-xl bg-[#151716] p-5 text-white">
              <Eyebrow className="text-mint">Why now</Eyebrow>
              <ul className="mt-3 space-y-2 text-[13px] text-white/80">
                {alert.schedule.map(s => <li key={s.date}><span className="font-semibold text-white">{shortDay(s.date)}</span> · {s.label}</li>)}
              </ul>
              <p className="mt-3 text-[13px] text-white/80">The last call is the latest a treasury transfer can still settle before the due date.</p>
              <p className="mt-4 font-mono text-[11px] text-white/50">Timing is a hypothesis we test in the pilot (7 vs. 14 days).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
