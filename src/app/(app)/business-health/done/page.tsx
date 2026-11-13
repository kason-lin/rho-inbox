'use client';
/**
 * Story beat 4 (end): "Done". The gap is gone, the invoice is scheduled, and the receipt shows what
 * will happen. Also "Why am I seeing this?" and "This is wrong", as in the spec.
 */
import { CheckCircle2, ThumbsDown } from 'lucide-react';
import Link from 'next/link';
import { CashChart } from '@/components/health/cash-chart';
import { PresenterBar } from '@/components/health/presenter-bar';
import { Receipt } from '@/components/health/receipt';
import { healthPost, useHealth } from '@/components/health/use-health';
import { Card } from '@/components/shell/page-header';
import { formatUSD } from '@/lib/format';

export default function DonePage() {
  const { data } = useHealth();
  if (!data) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <>
      <PresenterBar className="mb-6" />
      {!data.approval || !data.forecast || !data.invoice ? (
        <p className="text-[14px]">Nothing approved yet. <Link href="/business-health/proof" className="font-semibold text-brand underline">Review the invoice</Link></p>
      ) : (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-positive-bg text-positive"><CheckCircle2 className="size-7" /></div>
            <h1 className="mt-4 text-[22px] font-semibold">The ${data.invoice.amount / 1000}K invoice is covered and scheduled.</h1>
            <p className="mt-1 text-[14px] text-ink-2">
              Gap closed: checking stays at or above {formatUSD(data.forecast.low.balance)} through the due date.
            </p>
          </div>
          <Receipt data={data} />
          <Card title="Projected checking now">
            <div className="px-5 py-4"><CashChart forecast={data.forecast} /></div>
          </Card>
          <Card title="Why am I seeing this?">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-[13px] text-ink-2">
              <span>An invoice was due within 30 days that checking couldn’t cover, and treasury could.</span>
              <button onClick={() => void healthPost('feedback', { card_id: 'money-owed', kind: 'wrong' })} className="flex h-[30px] items-center gap-1 rounded-md border bg-white px-2.5 text-[12px] font-semibold hover:bg-[#f2f5f4]">
                <ThumbsDown className="size-3.5" /> This is wrong
              </button>
            </div>
          </Card>
          <div className="flex justify-center gap-4 text-[13px] font-semibold">
            <Link href="/business-health" className="text-brand hover:underline">Back to Business health</Link>
            <Link href="/business-health/spend" className="text-brand hover:underline">Next: where the money goes →</Link>
          </div>
        </div>
      )}
    </>
  );
}
