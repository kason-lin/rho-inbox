'use client';
/**
 * Story beat 2: on Nov 18, 14 days before the invoice is due, Rho sends one alert (email or text, the
 * founder picks). It goes out only because a decision is due. Review opens the Business health tab.
 */
import { Archive, ArrowLeft, BellOff, ChevronLeft, Clock, Forward, Mail, MessageSquare, MoreVertical, Reply, Star, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { AlertEmailBody } from '@/components/health/alert-email';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Btn, Eyebrow } from '@/components/health/ui';
import { useHealth } from '@/components/health/use-health';
import { longDay, shortDay } from '@/lib/health/dates';
import { formatUSDShort } from '@/lib/format';
import { cn } from 'cn';

export default function AlertPage() {
  const { data } = useHealth();
  const [channel, setChannel] = useState<'email' | 'text'>('text');
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
                {(['text', 'email'] as const).map(c => (
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
              <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                {/* mail client toolbar */}
                <div className="flex items-center gap-4 border-b px-5 py-2.5 text-[#5f6368]">
                  <ArrowLeft className="size-4" /><Archive className="size-4" /><Trash2 className="size-4" /><Mail className="size-4" /><Clock className="size-4" />
                  <span className="ml-auto text-[12px]">1 of 248</span>
                </div>
                <div className="px-6 pt-5">
                  <h2 className="flex flex-wrap items-center gap-2 text-[21px] text-[#1f1f1f]">
                    {alert.text.split('.')[0]}
                    <span className="rounded bg-[#e8eaed] px-1.5 py-0.5 text-[11px] text-[#444746]">Inbox</span>
                  </h2>
                  <div className="mt-4 flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#0f0f10] font-wordmark text-[18px] text-[#f5f8f8]">R</span>
                    <div className="min-w-0 flex-1 text-[13px]">
                      <div><span className="font-semibold text-[#1f1f1f]">Rho</span> <span className="text-[12px] text-[#5f6368]">&lt;alerts@rho.co&gt;</span></div>
                      <div className="text-[12px] text-[#5f6368]">to me</div>
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-[#5f6368]">
                      <span>{shortDay(data.date)}, 8:00 AM</span><Star className="size-4" /><Reply className="size-4" /><MoreVertical className="size-4" />
                    </div>
                  </div>
                </div>

                {/* the HTML email itself */}
                <div className="mx-6 mt-5 mb-6 rounded-lg bg-[#f4f6f6] px-4 py-6 sm:ml-[76px]">
                  <AlertEmailBody data={data} />
                </div>

                <div className="flex gap-2 px-6 pb-6 sm:pl-[76px]">
                  <span className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] text-[#444746]"><Reply className="size-4" /> Reply</span>
                  <span className="flex items-center gap-2 rounded-full border px-4 py-1.5 text-[13px] text-[#444746]"><Forward className="size-4" /> Forward</span>
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
