'use client';
import { ArrowLeftRight, ArrowRight, CalendarCheck, ChevronDown, CreditCard, Plus } from 'lucide-react';
import Link from 'next/link';
import { useCheckin } from '@/components/checkin/shared';
import { Card, HeaderButton, PageHeader } from '@/components/shell/page-header';
import { SourceIcon } from '@/components/shell/source-icon';
import { useViewer } from '@/components/shell/viewer';
import { useLive } from '@/hooks/use-live';
import { formatUSD, oneDecimal, relativeTime } from '@/lib/format';
import type { InboxThread } from '@/lib/types';

/** Home: the Rho dashboard frame, with this week's Check-in and the Inbox surfaced on it. */
export default function Home() {
  const { viewer } = useViewer();
  const { data: checkin } = useCheckin();
  const { data: inbox } = useLive<{ threads: InboxThread[] }>('/api/events', ['inbox_events']);
  const total = checkin?.accounts.reduce((t, a) => t + a.balance, 0) ?? 0;

  return (
    <>
      <PageHeader
        title={`Good morning, ${viewer.name.split(' ')[0]}`}
        actions={
          <>
            <HeaderButton>More <ChevronDown className="size-3.5" /></HeaderButton>
            <Link href="/soon/banking"><HeaderButton><ArrowLeftRight className="size-3.5" /> Transfer</HeaderButton></Link>
            <Link href="/soon/banking"><HeaderButton><Plus className="size-3.5" /> Deposit</HeaderButton></Link>
            <Link href="/soon/cards"><HeaderButton><CreditCard className="size-3.5" /> Create card</HeaderButton></Link>
            <Link href="/soon/bill-pay" className="flex h-8 items-center rounded-md bg-mint px-3 text-[13px] font-semibold text-mint-ink hover:bg-mint-hover">Pay</Link>
          </>
        }
      />

      <Card
        title={<span className="flex items-center gap-2"><CalendarCheck className="size-4" /> Monday Check-in</span>}
        action={<Link href="/checkin" className="text-[13px] font-medium text-brand hover:underline">Open</Link>}
        className="mb-4"
      >
        <div className="px-5 pb-4">
          <p className="font-display text-lg font-semibold">
            {checkin ? (checkin.cards.length ? `${checkin.cards.length} ${checkin.cards.length === 1 ? 'thing needs' : 'things need'} you this week` : "You're all set this week") : ' '}
          </p>
          <ol className="mt-2 divide-y">
            {checkin?.cards.map((c, i) => (
              <li key={c.id}>
                <Link href={`/checkin/${c.id}`} className="flex items-center gap-3 py-2.5 text-[13px] hover:text-brand">
                  <span className="w-4 font-semibold text-muted-foreground">{i + 1}</span>
                  <span className="flex-1"><span className="font-medium">{c.title}</span>{c.question ? ` ${c.question}` : ''}</span>
                  <ArrowRight className="size-3.5 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ol>
          {checkin && <p className="mt-1 text-xs text-muted-foreground">+ {checkin.others.length} other things look fine</p>}
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Rho accounts" className="md:col-span-1">
          <div className="divide-y px-5 pb-3">
            {checkin?.accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between py-2.5 text-[13px]">
                <div>
                  <div className="font-medium">{a.name}</div>
                  <div className="text-xs text-muted-foreground">•• {a.last4}{a.id === 'treasury' ? ' · 4.32% net yield' : ''}</div>
                </div>
                <span className="tabular">{formatUSD(a.balance)}</span>
              </div>
            ))}
            {checkin && (
              <div className="flex items-center justify-between py-2.5 text-[13px] font-semibold">
                Total cash <span className="tabular">{formatUSD(total)}</span>
              </div>
            )}
          </div>
        </Card>

        <Card title="Runway" className="md:col-span-1">
          <div className="px-5 pb-5">
            {checkin && (
              <>
                <div className="font-display text-3xl font-semibold">{oneDecimal(checkin.runway_months)} months</div>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  At {formatUSD(checkin.burn.average)} average monthly burn. Projected {formatUSD(checkin.burn.projected)} with known changes.
                </p>
              </>
            )}
          </div>
        </Card>

        <Card title="Inbox" action={<Link href="/inbox" className="text-[13px] font-medium text-brand hover:underline">Open</Link>} className="md:col-span-1">
          <ul className="divide-y px-5 pb-3">
            {inbox?.threads.slice(0, 4).map(t => (
              <li key={t.thread_id}>
                <Link href={`/inbox?thread=${t.thread_id}`} className="flex items-center gap-2.5 py-2 text-[13px]">
                  <SourceIcon source={t.source} className="size-6" />
                  <span className={`min-w-0 flex-1 truncate ${t.status === 'unread' ? 'font-semibold' : ''}`}>{t.head.title}</span>
                  <span className="text-xs text-muted-foreground">{relativeTime(t.head.created_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
