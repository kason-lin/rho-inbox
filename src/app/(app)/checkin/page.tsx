'use client';
import { ArrowRight, CheckCircle2, ChevronDown, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { DigestCard } from '@/components/checkin/digest';
import { DataAsOf, RoleBanner, TypeChip, useCheckin } from '@/components/checkin/shared';
import { HeaderButton, PageHeader } from '@/components/shell/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { shortDate } from '@/lib/format';

export default function CheckinPage() {
  const { data, loading, error } = useCheckin();
  const [showOthers, setShowOthers] = useState(false);

  return (
    <>
      <PageHeader
        title="Monday Check-in"
        subtitle={data ? <>Week of {shortDate(`${data.week_of}T12:00:00`)} · Rho did the prep work. You just say yes or no.</> : ' '}
        actions={<Link href="/mail"><HeaderButton><Mail className="size-3.5" /> See it as the email</HeaderButton></Link>}
      />
      <RoleBanner />
      {error && <p className="text-sm text-negative">{error}</p>}
      {loading && !data && <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}</div>}

      {data && (
        <>
          <DigestCard />
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">
              {data.cards.length ? `${data.cards.length} ${data.cards.length === 1 ? 'thing needs' : 'things need'} you` : "You're all set this week"}
            </h2>
            <DataAsOf iso={data.data_as_of} />
          </div>

          <ol className="space-y-3">
            {data.cards.map((c, i) => (
              <li key={c.id}>
                <Link href={`/checkin/${c.id}`} className="group flex items-start gap-4 rounded-lg border bg-white p-5 transition-shadow hover:shadow-sm">
                  <span className="font-display text-2xl leading-none font-semibold text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <TypeChip type={c.type} urgent={c.urgent} />
                    <p className="mt-2 text-[15px] font-semibold">{c.title}</p>
                    {c.question && <p className="text-[15px]">{c.question}</p>}
                    <p className="mt-1.5 line-clamp-1 text-[13px] text-muted-foreground">{c.why}</p>
                  </div>
                  <span className="mt-1 flex items-center gap-1 text-[13px] font-medium text-brand group-hover:underline">
                    {c.action && c.action.kind !== 'share' ? 'Review' : 'See breakdown'} <ArrowRight className="size-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          {!data.cards.length && (
            <div className="flex items-center gap-3 rounded-lg border bg-white p-5 text-[15px]">
              <CheckCircle2 className="size-5 text-positive" /> Nothing needs a decision. Payroll and bills are covered.
            </div>
          )}

          <div className="mt-4 rounded-lg border bg-white">
            <button onClick={() => setShowOthers(s => !s)} className="flex w-full items-center gap-2 px-5 py-3.5 text-left text-[13px]">
              <CheckCircle2 className="size-4 text-positive" />
              <span>
                <span className="font-medium">We checked {data.others.length} other things.</span> They look fine.
              </span>
              <ChevronDown className={`ml-auto size-4 text-muted-foreground transition-transform ${showOthers ? 'rotate-180' : ''}`} />
            </button>
            {showOthers && (
              <ul className="divide-y border-t">
                {data.others.map(o => <li key={o} className="px-5 py-2 text-[13px] text-ink-2">{o}</li>)}
                <li className="px-5 py-3">
                  <Link href="/inbox" className="text-[13px] font-medium text-brand hover:underline">See everything in your Inbox →</Link>
                </li>
              </ul>
            )}
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Every card links to the exact transactions behind it. Nothing moves until the right person approves, and every suggestion and decision is logged in the <Link href="/audit" className="underline">audit log</Link>.
          </p>
        </>
      )}
    </>
  );
}
