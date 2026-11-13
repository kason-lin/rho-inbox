'use client';
import {
  ArrowLeftRight, ArrowRight, ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronRight, CreditCard, Gift, Landmark, Send, Vault,
} from 'lucide-react';
import Link from 'next/link';
import { useHealth } from '@/components/health/use-health';
import { BalanceChart } from '@/components/home/balance-chart';
import { Card, HeaderButton, MonthNav, PageHeader } from '@/components/shell/page-header';
import { NewBadge } from '@/components/shell/sidebar';
import { useViewer } from '@/components/shell/viewer';
import { useEffect, useState } from 'react';
import { formatUSD } from '@/lib/format';
import { longDay } from '@/lib/health/dates';
import type { HomeData } from '@/lib/home';

const LOGO_COLORS = ['#151716', '#048d73', '#5a4bd1', '#1c5f80', '#b97800', '#c2316e'];
const logoColor = (name: string) => LOGO_COLORS[[...name].reduce((h, c) => h + c.charCodeAt(0), 0) % LOGO_COLORS.length];

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}

/** Home: Rho's dashboard layout, with this week's Check-in surfaced at the top. */
export default function Home() {
  const { viewer } = useViewer();
  const { data: health } = useHealth();
  const [home, setHome] = useState<HomeData | null>(null);
  useEffect(() => { fetch('/api/home').then(r => r.json()).then(setHome); }, []);

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${viewer.name.split(' ')[0]}. Here’s where Loop Labs stands.`}
        actions={
          <>
            <HeaderButton>More <ChevronDown /></HeaderButton>
            <Link href="/soon/banking"><HeaderButton><ArrowLeftRight /> Transfer</HeaderButton></Link>
            <Link href="/soon/banking"><HeaderButton><ArrowRight /> Deposit</HeaderButton></Link>
            <Link href="/soon/cards"><HeaderButton><CreditCard /> Create card</HeaderButton></Link>
            <Link href="/soon/bill-pay" className="flex h-[30px] items-center gap-1.5 rounded-md bg-mint px-3 text-[12px] font-semibold text-mint-ink hover:bg-mint-hover">
              <Send className="size-3.5" /> Pay
            </Link>
          </>
        }
      />

      {/* The prototype's feature, sitting on top of Rho's dashboard */}
      <Card
        title={<>Business health <NewBadge /></>}
        action={<Link href="/business-health" className="text-[12px] font-semibold text-brand hover:underline">Open Business health</Link>}
        className="mb-7"
      >
        <ol className="divide-y">
          {health && !health.ready && health.invoice && (
            <li className="flex items-center gap-4 px-5 py-3 text-[13px]">
              <span className="flex-1">Rho found a {formatUSD(health.invoice.amount)} invoice from {health.invoice.vendor}, due {longDay(health.invoice.due)}. Nothing to decide yet.</span>
            </li>
          )}
          {health?.approval && health.invoice && (
            <li className="px-5 py-3 text-[13px] font-semibold text-positive">The ${health.invoice.amount / 1000}K invoice is covered and scheduled.</li>
          )}
          {health?.needs_you.cards.map((c, i) => (
            <li key={c.id}>
              <Link href={c.href} className="flex items-center gap-4 px-5 py-3 text-[13px] hover:bg-[#f7f9f8]">
                <span className="w-3 text-muted-foreground">{i + 1}</span>
                {c.urgent && <span className="rounded bg-negative-bg px-1.5 py-px text-[10px] font-semibold text-negative">Urgent</span>}
                <span className="flex-1"><span className="font-semibold">{c.title}</span>{c.question ? ` ${c.question}` : ''}</span>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ol>
        {health?.ready && (
          <div className="flex items-center justify-between border-t px-5 py-2.5 text-[12px] text-muted-foreground">
            <span>+ {health.needs_you.others} other things look fine</span>
            <span>Sample data</span>
          </div>
        )}
      </Card>

      <Card
        title="Balance"
        action={<span className="flex gap-5 text-[12px] font-semibold"><span className="flex items-center gap-1">All accounts <ChevronDown className="size-3.5" /></span><span className="flex items-center gap-1">Last 30 days <ChevronDown className="size-3.5" /></span></span>}
        className="mb-7"
      >
        <div className="px-5 pt-4 pb-4">
          <div className="text-[12px] text-muted-foreground">All accounts</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="tabular text-[26px] font-medium tracking-tight">{home ? formatUSD(home.total) : '—'}</span>
            {home && (
              <span className="flex flex-wrap items-center gap-3 text-[11px] text-ink-2">
                <span className="flex items-center gap-1"><span className="grid size-4 place-items-center rounded-full bg-positive-bg text-positive"><ArrowDownLeft className="size-2.5" /></span>{formatUSD(home.last30.inflows)}</span>
                <span className="flex items-center gap-1"><span className="grid size-4 place-items-center rounded-full bg-negative-bg text-negative"><ArrowUpRight className="size-2.5" /></span>{formatUSD(home.last30.outflows)}</span>
                <span className="flex items-center gap-1"><ArrowLeftRight className="size-3" />{formatUSD(0)} Pending in Treasury</span>
              </span>
            )}
          </div>
          {home ? <BalanceChart series={home.series} /> : <div className="mt-4 h-[180px] animate-pulse rounded bg-[#f5f7f6]" />}
        </div>
      </Card>

      <div className="mb-7 grid gap-6 lg:grid-cols-3">
        <Card title="Rho accounts">
          <ul className="px-5 py-3">
            {home?.accounts.map(a => (
              <li key={a.id} className="flex items-center gap-3 py-2.5 text-[13px]">
                <span className="grid size-8 place-items-center rounded-full bg-[#f2f5f4]">
                  {a.id === 'treasury' ? <Vault className="size-4" strokeWidth={1.6} /> : <Landmark className="size-4" strokeWidth={1.6} />}
                </span>
                <span className="flex-1 leading-tight">
                  <span className="block">{a.name}</span>
                  <span className="block text-[12px] text-muted-foreground">{a.id === 'treasury' ? '4.25% net yield' : `•••• ${a.last4}`}</span>
                </span>
                <span className="tabular">{formatUSD(a.balance)}</span>
              </li>
            ))}
          </ul>
        </Card>

        <FlowCard title="Money outflows" label={home?.month.label} totalLabel="Total outflows" total={home ? -home.month.outflows : null} topLabel="Top outflows" items={home?.month.topOutflows.map(f => ({ ...f, amount: -f.amount }))} />
        <FlowCard title="Money inflows" label={home?.month.label} totalLabel="Total inflows" total={home?.month.inflows ?? null} topLabel="Top inflows" items={home?.month.topInflows} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card title="Credit spend">
          <div className="px-5 py-4 text-[13px]">
            <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">Balance <span className="size-2 rounded-full bg-strong" /></div>
            {home && (
              <>
                <div className="mt-1"><span className="tabular text-[16px] font-semibold">{formatUSD(home.credit.balance)}</span> <span className="text-[11px] text-muted-foreground">/ {formatUSD(home.credit.limit)}</span></div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#eef2f1]"><div className="h-full rounded-full bg-[#3ecfa3]" style={{ width: `${Math.max(2, (home.credit.balance / home.credit.limit) * 100)}%` }} /></div>
              </>
            )}
          </div>
        </Card>
        <Card title={<>Invoices <NewBadge /></>}>
          <div className="px-5 py-4">
            <div className="text-[12px] text-muted-foreground">Total unpaid</div>
            <div className="tabular mt-1 text-[16px] font-semibold">{home ? formatUSD(home.invoicesUnpaid) : '—'}</div>
          </div>
        </Card>
        <Card title="Customer perks" action={<span className="text-[12px] text-ink-2">‹ &nbsp; ›</span>}>
          <div className="flex items-center gap-3 px-5 py-4 text-[13px]">
            <span className="grid size-8 place-items-center rounded-full bg-[#f2f5f4]"><Gift className="size-4" strokeWidth={1.6} /></span>
            <span className="text-ink-2">Partner perks for seed-stage teams</span>
          </div>
        </Card>
      </div>
    </>
  );
}

function FlowCard({ title, label, totalLabel, total, topLabel, items }: {
  title: string; label?: string; totalLabel: string; total: number | null; topLabel: string; items?: { name: string; amount: number }[];
}) {
  return (
    <Card title={title} action={label ? <MonthNav label={label} /> : null}>
      <div className="px-5 py-4">
        <div className="text-[12px] text-muted-foreground">{totalLabel}</div>
        <div className="tabular mt-1 text-[16px] font-semibold">{total === null ? '—' : formatUSD(total)}</div>
        <div className="mt-4 text-[12px] text-muted-foreground">{topLabel}</div>
        <ul className="mt-1">
          {items?.map(f => (
            <li key={f.name} className="flex items-center gap-2.5 py-1.5 text-[13px]">
              <span className="grid size-4 place-items-center rounded-[4px] text-[8px] font-bold text-white" style={{ background: logoColor(f.name) }}>{f.name[0]}</span>
              <span className="flex-1 truncate">{f.name}</span>
              <span className="tabular">{formatUSD(f.amount)}</span>
            </li>
          ))}
          {items && !items.length && <li className="py-1.5 text-[13px] text-muted-foreground">Nothing yet this month.</li>}
        </ul>
      </div>
    </Card>
  );
}
