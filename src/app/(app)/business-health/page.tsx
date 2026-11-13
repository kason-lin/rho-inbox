'use client';
/**
 * Story beat 3: the Business health tab. Three sections from the spec:
 *   Coming up   projected checking vs. everything due, with the gap highlighted
 *   Needs you   3 cards at most (the $55K invoice first)
 *   Where it goes  spend by purpose (the Claude bill)
 */
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, Plug, ThumbsDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { CashChart } from '@/components/health/cash-chart';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Receipt } from '@/components/health/receipt';
import { Timeline } from '@/components/health/timeline';
import { healthPost, useHealth } from '@/components/health/use-health';
import { Card, HeaderButton, PageHeader } from '@/components/shell/page-header';
import { longDay } from '@/lib/health/dates';
import { formatUSD } from '@/lib/format';
import { cn } from 'cn';

export default function BusinessHealthPage() {
  const { data } = useHealth();
  const [busy, setBusy] = useState<string | null>(null);

  async function feedback(cardId: string, kind: 'not_now' | 'wrong') {
    setBusy(cardId);
    try { await healthPost('feedback', { card_id: cardId, kind }); } finally { setBusy(null); }
  }

  return (
    <>
      <PresenterBar className="mb-6" />
      <PageHeader
        title="Business health"
        subtitle={data ? <>Loop Labs · as of {longDay(data.date)} · <span className="font-medium text-ink-2">Sample data</span></> : ' '}
        actions={<Link href="/business-health/connect"><HeaderButton><Plug /> Connected tools</HeaderButton></Link>}
      />

      {data && !data.ready && (
        <Card className="mb-7">
          <div className="flex items-center gap-3 px-5 py-4 text-[13px]">
            <Clock className="size-4 text-muted-foreground" />
            <span>
              Rho found {data.invoice ? <>a {formatUSD(data.invoice.amount)} invoice from {data.invoice.vendor}, due {longDay(data.invoice.due)}</> : 'nothing due yet'}.
              It’s nowhere near due, so there’s nothing to decide. Jump the demo date to <b>Nov 18</b> to see the forecast.
            </span>
          </div>
        </Card>
      )}

      {data?.ready && data.forecast && (
        <>
          {data.approval && (
            <div className="mb-7 space-y-3">
              <div className="flex items-center gap-2 rounded-lg bg-positive-bg px-4 py-3 text-[14px] font-semibold text-positive">
                <CheckCircle2 className="size-4" /> The {data.invoice ? `$${data.invoice.amount / 1000}K` : ''} invoice is covered and scheduled.
              </div>
              <Receipt data={data} />
            </div>
          )}

          {/* Coming up */}
          <Card
            title={<span id="coming-up">Coming up</span>}
            action={<span className="text-[12px] text-muted-foreground">Projected checking vs. everything due through {longDay(data.forecast.end)}</span>}
            className="mb-7"
          >
            <div className="px-5 pt-4 pb-3">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <span className="text-[12px] text-muted-foreground">Checking ••{data.accounts.checking.last4} today</span>
                <span className="tabular text-[22px] font-medium">{formatUSD(data.forecast.opening)}</span>
                {data.forecast.shortfall > 0 ? (
                  <span className="flex items-center gap-1.5 rounded-md bg-negative-bg px-2 py-1 text-[12px] font-semibold text-negative">
                    <AlertTriangle className="size-3.5" /> {formatUSD(data.forecast.shortfall)} short on {longDay(data.forecast.low.date)}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-md bg-positive-bg px-2 py-1 text-[12px] font-semibold text-positive">
                    <CheckCircle2 className="size-3.5" /> Covered: lowest balance {formatUSD(data.forecast.low.balance)}
                  </span>
                )}
              </div>
              <div className="mt-4"><CashChart forecast={data.forecast} /></div>
            </div>
            <div className="border-t">
              <Timeline forecast={data.forecast} highlight={data.forecast.shortfall > 0 ? data.obligations.find(o => o.kind === 'invoice')?.id : undefined} />
            </div>
          </Card>

          {/* Needs you */}
          <Card title={<span id="needs-you">Needs you</span>} action={<span className="text-[12px] text-muted-foreground">3 cards at most</span>} className="mb-7">
            <ol className="divide-y">
              {data.needs_you.cards.map((c, i) => (
                <li key={c.id} className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4', c.urgent && 'bg-negative-bg/30')}>
                  <span className="w-3 text-[13px] text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    {c.urgent && <span className="mb-1 inline-block rounded bg-negative-bg px-1.5 py-px text-[10px] font-semibold text-negative">Urgent</span>}
                    <p className="text-[14px]"><span className="font-semibold">{c.title}</span>{c.question ? ` ${c.question}` : ''}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Why am I seeing this? {c.why}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button disabled={busy !== null} onClick={() => void feedback(c.id, 'not_now')} className="flex h-[30px] items-center gap-1 rounded-md border bg-white px-2.5 text-[12px] font-semibold hover:bg-[#f2f5f4]"><Clock className="size-3.5" /> Not now</button>
                    <button disabled={busy !== null} onClick={() => void feedback(c.id, 'wrong')} className="flex h-[30px] items-center gap-1 rounded-md border bg-white px-2.5 text-[12px] font-semibold hover:bg-[#f2f5f4]"><ThumbsDown className="size-3.5" /> This is wrong</button>
                    {c.type !== 'subscription' && (
                      <Link href={c.href} className="flex h-[30px] items-center gap-1 rounded-md bg-mint px-3 text-[12px] font-semibold text-mint-ink hover:bg-mint-hover">
                        {c.type === 'money_owed' ? 'Review' : 'See breakdown'} <ArrowRight className="size-3.5" />
                      </Link>
                    )}
                  </div>
                </li>
              ))}
              {!data.needs_you.cards.length && <li className="px-5 py-4 text-[13px]">Nothing needs a decision right now.</li>}
            </ol>
            <div className="border-t px-5 py-2.5 text-[12px] text-muted-foreground">+ {data.needs_you.others} other things look fine</div>
          </Card>

          {/* Where it goes */}
          <Card title="Where it goes" action={<Link href="/business-health/spend" className="text-[12px] font-semibold text-brand hover:underline">See breakdown</Link>}>
            <Link href="/business-health/spend" className="block px-5 py-4 hover:bg-[#f7f9f8]">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[13px]"><span className="font-semibold">{data.where_it_goes.provider}</span> <span className="text-muted-foreground">this month</span></span>
                <span className="tabular text-[18px] font-semibold">{formatUSD(data.where_it_goes.amount)}</span>
              </div>
              <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
                {data.where_it_goes.purposes.map((p, i) => (
                  <span key={p.label} className={i === 0 ? 'bg-[#5a4bd1]' : 'bg-[#3ecfa3]'} style={{ width: `${(p.amount / data.where_it_goes.amount) * 100}%` }} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[12px]">
                {data.where_it_goes.purposes.map((p, i) => (
                  <span key={p.label} className="flex items-center gap-1.5">
                    <span className={cn('size-2 rounded-full', i === 0 ? 'bg-[#5a4bd1]' : 'bg-[#3ecfa3]')} /> {p.label} <span className="tabular font-semibold">{formatUSD(p.amount)}</span>
                  </span>
                ))}
              </div>
            </Link>
          </Card>
        </>
      )}
    </>
  );
}
